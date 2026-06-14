'use client'

import { useState, useRef } from 'react'
import { saveStopEvent, getCheckins } from '@/lib/data'
import type { Profile } from '@/types'
import type { Screen } from './App'

type Phase = 1 | 2 | 3 | 4

const IMPULSES = [
  { icon: '💬', label: 'Text them' },
  { icon: '📱', label: 'Check their social media' },
  { icon: '🚗', label: 'Drive past their place' },
  { icon: '✉️', label: 'Send a message or letter' },
]

function today() { return new Date().toISOString().slice(0, 10) }
function daysSince(d: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) + 1)
}

interface Props {
  profile: Profile
  setScreen: (s: Screen) => void
  toast: (msg: string) => void
}

export default function StopMe({ profile, setScreen, toast }: Props) {
  const [phase, setPhase] = useState<Phase>(1)
  const [impulse, setImpulse] = useState('')
  const [showOther, setShowOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [aiText, setAiText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [seconds, setSeconds] = useState(1200)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const outcomeMessages: Record<string, string> = {
    did_it: "You did it. That doesn't undo everything you've built. One slip isn't the arc.\n\nOpen the Vault and write down exactly how you feel right now — before the rationalization starts.\n\nThen come back tomorrow.",
    blocked: "You didn't do it. That's the whole thing — that's it.\n\nGo do your task for today. Then do something physical. You've just proved to yourself that you can wait it out.\n\nThat evidence compounds.",
    kinda: "Almost but not quite — that counts as a partial hold. The impulse is real and hard. Don't be hard on yourself about 'kind of'.\n\nSet one boundary for tonight: phone in another room before 9pm. Start there.",
  }
  const [outcome, setOutcome] = useState('')

  async function selectImpulse(imp: string) {
    if (!imp.trim()) { toast('Tell us what you\'re about to do.'); return }
    setImpulse(imp)
    setPhase(2)
    setAiText('')
    setStreaming(true)

    try {
      const checkins = await getCheckins()
      const lastCI = checkins[0]
      const res = await fetch('/api/stop-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impulse: imp,
          day: daysSince(profile.breakup_date!),
          whoEnded: profile.who_ended,
          dangerBehavior: profile.danger_behavior,
          biggestFear: profile.biggest_fear,
          mood: lastCI?.mood,
        }),
      })

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const { text } = JSON.parse(data)
            if (text) { full += text; setAiText(full) }
          } catch {}
        }
      }

      if (!full) throw new Error('empty')
      startTimer()
    } catch {
      setAiText("You want to do this because the silence is unbearable — and that's real. But this will give you a few seconds of relief followed by hours of replaying it.\n\nOpen the Vault and write exactly what you were going to say. Then wait 20 minutes.")
      startTimer()
    }
    setStreaming(false)
  }

  function startTimer() {
    setSeconds(1200)
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setPhase(3)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function didDoIt(result: 'did_it' | 'blocked' | 'kinda') {
    clearInterval(timerRef.current!)
    await saveStopEvent({ impulse, result, date: today() })
    setOutcome(outcomeMessages[result])
    setPhase(4)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => { clearInterval(timerRef.current!); setScreen('home') }}>←</button>
        <div style={styles.title}>Stop Me</div>
      </div>
      <div style={styles.body}>

        {phase === 1 && (
          <>
            <div style={styles.h2}>What are you about to do?</div>
            <div style={styles.sub}>Be honest. No judgment.</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
              {IMPULSES.map(({ icon, label }) => (
                <button key={label} style={styles.impulseBtn} onClick={() => selectImpulse(label)}>
                  <span style={{fontSize:20,width:28,textAlign:'center'}}>{icon}</span>
                  {label}
                </button>
              ))}
              <button style={styles.impulseBtn} onClick={() => setShowOther(true)}>
                <span style={{fontSize:20,width:28,textAlign:'center'}}>💭</span>
                Something else...
              </button>
            </div>
            {showOther && (
              <div style={{marginTop:16}}>
                <input type="text" value={otherText} onChange={e => setOtherText(e.target.value)}
                  placeholder="What are you about to do?" />
                <button style={styles.btn} onClick={() => selectImpulse(otherText)}>Continue</button>
              </div>
            )}
          </>
        )}

        {phase === 2 && (
          <>
            <div style={styles.aiLabel}>REBUILT says</div>
            <div style={styles.aiBox}>
              {aiText || ' '}
              {streaming && <span style={styles.cursor} />}
            </div>
            {!streaming && (
              <div style={{marginTop:24}}>
                <div style={{textAlign:'center',padding:'32px 0'}}>
                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:72,letterSpacing:'-0.02em'}}>{mm}:{ss}</div>
                  <div style={{fontSize:11,color:'var(--g3)',letterSpacing:'0.15em',textTransform:'uppercase',marginTop:8}}>Wait this out.</div>
                </div>
                <div style={{height:4,background:'var(--g2)',borderRadius:2,margin:'0 0 12px'}}>
                  <div style={{height:4,background:'var(--amber)',borderRadius:2,width:`${(seconds/1200)*100}%`,transition:'width 1s linear'}}/>
                </div>
                <div style={{fontSize:12,color:'var(--g3)',textAlign:'center'}}>Most impulses pass in 20 minutes.</div>
              </div>
            )}
          </>
        )}

        {phase === 3 && (
          <>
            <div style={styles.h2}>Did you do it?</div>
            <div style={styles.sub}>No judgment. Just tell us.</div>
            <div style={{display:'flex',gap:12,marginTop:24}}>
              {[['Yes','did_it'],['No','blocked'],['Kind of','kinda']] .map(([label, val]) => (
                <button key={val} style={styles.didBtn} onClick={() => didDoIt(val as 'did_it'|'blocked'|'kinda')}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 4 && (
          <>
            <div style={styles.aiLabel}>REBUILT</div>
            <div style={{...styles.aiBox,whiteSpace:'pre-wrap'}}>{outcome}</div>
            <button style={{...styles.btn,marginTop:16}} onClick={() => setScreen('home')}>Back to home</button>
          </>
        )}

      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {display:'flex',flexDirection:'column',height:'100vh',background:'var(--black)',overflowY:'auto'},
  header: {padding:'20px 24px',display:'flex',alignItems:'center',gap:16,borderBottom:'1px solid var(--g1)',position:'sticky',top:0,background:'var(--black)',zIndex:10},
  back: {background:'none',border:'none',color:'var(--g3)',fontSize:20,padding:0,cursor:'pointer'},
  title: {fontFamily:"'DM Serif Display',serif",fontSize:20},
  body: {padding:24,flex:1},
  h2: {fontFamily:"'DM Serif Display',serif",fontSize:24,marginBottom:8},
  sub: {fontSize:12,color:'var(--g3)',marginBottom:24},
  impulseBtn: {padding:'18px 20px',background:'var(--g1)',border:'1px solid var(--g2)',color:'var(--white)',borderRadius:6,fontFamily:"'DM Mono',monospace",fontSize:14,textAlign:'left',display:'flex',alignItems:'center',gap:12,cursor:'pointer'},
  aiLabel: {fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--red2)',marginBottom:16},
  aiBox: {background:'var(--g1)',border:'1px solid var(--g2)',borderRadius:8,padding:24,minHeight:120,fontSize:14,lineHeight:1.9,color:'var(--g4)'},
  cursor: {display:'inline-block',width:2,height:16,background:'var(--white)',verticalAlign:'middle',marginLeft:2,animation:'blink .8s step-end infinite'},
  didBtn: {flex:1,padding:'18px 8px',border:'1px solid var(--g2)',background:'var(--g1)',color:'var(--white)',borderRadius:6,fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:'0.08em',textAlign:'center',cursor:'pointer'},
  btn: {width:'100%',padding:16,background:'var(--red)',border:'none',color:'var(--white)',fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:'0.12em',textTransform:'uppercase',borderRadius:3,cursor:'pointer'},
}
