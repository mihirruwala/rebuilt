import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Simple in-memory rate limit: 10 requests per user per hour
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(userId, { count: 1, reset: now + 3_600_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { impulse, day, whoEnded, dangerBehavior, biggestFear, mood } = await req.json()

    if (!impulse?.trim()) {
      return new Response('Missing impulse', { status: 400 })
    }

    // Identify user (anonymous or authenticated)
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? req.headers.get('x-forwarded-for') ?? 'anon'

    if (!checkRateLimit(userId)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    const hour = new Date().getHours()
    const timeOfDay = hour < 6 ? 'late night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

    const prompt = `You are REBUILT — an honest, direct, caring recovery companion.

USER CONTEXT:
- Day ${day ?? '?'} since breakup
- Who ended it: ${whoEnded ?? 'unknown'}
- Their stated danger behavior: "${dangerBehavior ?? 'not specified'}"
- Their biggest fear: "${biggestFear ?? 'not specified'}"
- Recent mood: ${mood ?? '?'}/10
- Time: ${timeOfDay}

The user is about to: ${impulse}

Write a response that:
1. Acknowledges WHY they want to do this — it makes emotional sense
2. Honestly tells them what will likely happen if they do it (realistic, not catastrophizing)
3. Gives them ONE specific thing to do RIGHT NOW instead
4. Is under 120 words total

Do NOT be preachy. Do NOT say: "you'll find someone better", "everything happens for a reason", "time heals all wounds".`

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    // Stream SSE back to the browser
    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
        controller.enqueue(enc.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('stop-me API error:', err)
    return new Response('Internal error', { status: 500 })
  }
}
