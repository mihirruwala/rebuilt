'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getCheckins, getStopEvents } from '@/lib/data'
import type { Profile } from '@/types'
import type { Screen } from './App'
import BottomNav from './BottomNav'

// ─── ARC ─────────────────────────────────
interface ArcProps { profile: Profile; setScreen: (s: Screen) => void }

function daysSince(d: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) + 1)
}

export function Arc({ profile, setScreen }: ArcProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const [checkins, stops] = await Promise.all([getCheckins(), getStopEvents()])

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth * dpr
    const H = 160 * dpr
    canvas.width = W; canvas.height = H
    ctx.scale(dpr, dpr)
    const w = canvas.offsetWidth, h = 160
    ctx.clearRect(0, 0, w, h)

    if (checkins.length < 2) return

    const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date))
    const pL=16,pR=16,pT=16,pB=24
    const cw=w-pL-pR, ch=h-pT-pB

    const grad = ctx.createLinearGradient(pL,0,w-pR,0)
    grad.addColorStop(0,'#c0392b')
    grad.addColorStop(0.5,'#d4a847')
    grad.addColorStop(1,'#4caf7d')

    ctx.beginPath()
    sorted.forEach((ci, i) => {
      const day = daysSince(profile.breakup_date!) - daysSince(ci.date) + 1
      const x = pL+(Math.min(day-1,29)/29)*cw
      const y = pT+ch-((ci.mood-1)/9)*ch
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
    })
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.stroke()

    sorted.forEach(ci => {
      const day = daysSince(profile.breakup_date!) - daysSince(ci.date) + 1
      const x = pL+(Math.min(day-1,29)/29)*cw
      const y = pT+ch-((ci.mood-1)/9)*ch
      ctx.beginPath()
      ctx.arc(x,y,4,0,Math.PI*2)
      ctx.fillStyle = ci.mood<=3?'#c0392b':ci.mood<=6?'#d4a847':'#4caf7d'
      ctx.fill()
    })

    const moods = sorted.map(c => c.mood)
    const avg = (moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1)
    const noRegret = sorted.filter(c => c.regret === 'no').length
    const blocked = stops.filter(e => e.result === 'blocked').length

    const statsEl = document.getElementById('arc-stats')
    if (statsEl) {
      statsEl.innerHTML = [
        [sorted.length,'Days logged'],
        [avg,'Avg mood'],
        [noRegret,'No-regret days'],
        [blocked,'Impulses blocked'],
      ].map(([n,l]) => `
        <div style="background:var(--off);border:1px solid var(--g1);border-radius:6px;padding:18px">
          <div style="font-family:'DM Serif Display',serif;font-size:32px;color:var(--white)">${n}</div>
          <div style="font-size:10px;color:var(--g3);letter-spacing:0.12em;text-transform:uppercase;margin-top:4px">${l}</div>
        </div>
      `).join('')
    }
  }, [profile.breakup_date])

  useEffect(() => { draw() }, [draw])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--black)'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid var(--g1)',position:'sticky',top:0,background:'var(--black)',zIndex:5}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20}}>Recovery Arc</div>
        <div style={{fontSize:11,color:'var(--g3)'}}>Your honest journey.</div>
      </div>
      <div style={{padding:24,flex:1,overflowY:'auto'}}>
        <div style={{background:'var(--off)',border:'1px solid var(--g1)',borderRadius:8,padding:20,marginBottom:16}}>
          <canvas ref={canvasRef} style={{width:'100%',height:160,display:'block'}} />
        </div>
        <div id="arc-stats" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}/>
      </div>
      <BottomNav active="arc" setScreen={setScreen} />
    </div>
  )
}

// ─── CRISIS ──────────────────────────────
interface CrisisProps { profile: Profile; setScreen: (s: Screen) => void }

export function Crisis({ profile, setScreen }: CrisisProps) {
  const steps = [
    [5,'Name 5 things you can see right now.'],
    [4,'Name 4 things you can physically feel.'],
    [3,'Name 3 things you can hear.'],
    [2,'Name 2 things you can smell.'],
    [1,'Name 1 thing you can taste.'],
  ]
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d0000',padding:'40px 24px',textAlign:'center',overflowY:'auto'}}>
      <div style={{maxWidth:420}}>
        <div style={{fontSize:48,marginBottom:24}}>🆘</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,marginBottom:16}}>Crisis Mode</div>
        <div style={{color:'var(--g4)',fontSize:14,lineHeight:1.9,marginBottom:32}}>
          You activated this. That means you knew you needed it.<br/>That's the right call. Let's get through the next few minutes.
        </div>
        {profile.contact_name && (
          <div style={{background:'var(--g1)',border:'1px solid var(--g2)',borderRadius:8,padding:20,marginBottom:16,textAlign:'left'}}>
            <div style={{fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--g3)',marginBottom:8}}>Your emergency contact</div>
            <div style={{fontSize:16,color:'var(--white)'}}>{profile.contact_name} · {profile.contact_phone || '(no number)'}</div>
          </div>
        )}
        <div style={{textAlign:'left'}}>
          <div style={{fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--g3)',marginBottom:16}}>Grounding exercise</div>
          {steps.map(([n, text]) => (
            <div key={n} style={{display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid var(--g1)',alignItems:'flex-start'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'var(--g2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{n}</div>
              <div style={{fontSize:13,color:'var(--g4)',lineHeight:1.7}}>{text}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setScreen('home')}
          style={{width:'100%',padding:16,background:'var(--red)',border:'none',color:'var(--white)',fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:'0.12em',textTransform:'uppercase',borderRadius:3,marginTop:24,cursor:'pointer'}}>
          I'm okay. Take me home.
        </button>
        <div style={{fontSize:11,color:'var(--g3)',marginTop:16}}>
          If you're in crisis: <strong style={{color:'var(--white)'}}>iCall: 9152987821</strong> (India) · 988 (US)
        </div>
      </div>
    </div>
  )
}

export default Arc
