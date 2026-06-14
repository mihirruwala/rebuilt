'use client'
// Onboarding — identical flow to original, now saves via data.ts
import { useState } from 'react'
import { saveProfile } from '@/lib/data'
import type { Profile } from '@/types'

const STEPS = 6

interface Props {
  onComplete: (p: Profile) => void
  toast: (msg: string) => void
}

export default function Onboarding({ onComplete, toast }: Props) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<Profile>>({})

  async function finish() {
    const profile: Partial<Profile> = { ...data, onboarded: true }
    await saveProfile(profile)
    onComplete({ id: 'anon', onboarded: true, ...profile } as Profile)
  }

  const dots = Array.from({ length: STEPS }, (_, i) => (
    <div key={i} style={{flex:1,height:2,background: i < step-1 ? 'var(--red)' : i === step-1 ? 'var(--g3)' : 'var(--g2)',borderRadius:1}}/>
  ))

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--black)',padding:'40px 24px'}}>
      <div style={{width:'100%',maxWidth:500}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,letterSpacing:'0.15em',marginBottom:40}}>
          RE<span style={{color:'var(--red2)'}}>BUILT</span>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:48}}>{dots}</div>

        {step === 1 && <Step1 onNext={d => { setData(p => ({...p,...d})); setStep(2) }} />}
        {step === 2 && <Step2 onNext={d => { setData(p => ({...p,...d})); setStep(3) }} />}
        {step === 3 && <Step3 onNext={d => { setData(p => ({...p,...d})); setStep(4) }} />}
        {step === 4 && <Step4 onNext={d => { setData(p => ({...p,...d})); setStep(5) }} />}
        {step === 5 && <Step5 onNext={d => { setData(p => ({...p,...d})); setStep(6) }} />}
        {step === 6 && <Step6 onFinish={d => { setData(p => ({...p,...d})); finish() }} />}
      </div>
    </div>
  )
}

function Q({ q, hint }: { q: string; hint: string }) {
  return (
    <>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,marginBottom:8,lineHeight:1.2}}>{q}</div>
      <div style={{fontSize:12,color:'var(--g3)',marginBottom:32,letterSpacing:'0.05em'}}>{hint}</div>
    </>
  )
}

function Btn({ onClick, label = 'Continue' }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} style={{width:'100%',padding:16,background:'var(--red)',border:'none',color:'var(--white)',fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:'0.12em',textTransform:'uppercase',borderRadius:3,marginTop:24,cursor:'pointer'}}>{label}</button>
}

function Step1({ onNext }: { onNext: (d: Partial<Profile>) => void }) {
  const [val, setVal] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  return (
    <>
      <Q q="When did it end?" hint="Approximate is fine." />
      <input type="date" max={today} value={val} onChange={e => setVal(e.target.value)} />
      <Btn onClick={() => val && onNext({ breakup_date: val })} />
    </>
  )
}

function Step2({ onNext }: { onNext: (d: Partial<Profile>) => void }) {
  const [val, setVal] = useState<Profile['who_ended']>(null)
  const opts: {v: Profile['who_ended']; l: string}[] = [{v:'them',l:'They did'},{v:'me',l:'I did'},{v:'mutual',l:'Mutual'}]
  return (
    <>
      <Q q="Who ended it?" hint="Be honest. It matters." />
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {opts.map(o => (
          <button key={o.v} onClick={() => setVal(o.v)}
            style={{padding:'14px 18px',background:'var(--g1)',border:`1px solid ${val===o.v?'var(--red)':'var(--g2)'}`,color:val===o.v?'var(--red2)':'var(--white)',borderRadius:3,fontFamily:"'DM Mono',monospace",fontSize:13,textAlign:'left',cursor:'pointer'}}>
            {o.l}
          </button>
        ))}
      </div>
      <Btn onClick={() => val && onNext({ who_ended: val })} />
    </>
  )
}

function Step3({ onNext }: { onNext: (d: Partial<Profile>) => void }) {
  const [val, setVal] = useState('')
  return (
    <>
      <Q q="How long were you together?" hint="In months, roughly." />
      <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. 18 months" />
      <Btn onClick={() => val && onNext({ months: val })} />
    </>
  )
}

function Step4({ onNext }: { onNext: (d: Partial<Profile>) => void }) {
  const [val, setVal] = useState('')
  return (
    <>
      <Q q="What's the one thing you keep wanting to do that you know you shouldn't?" hint="This is what we'll intercept. Be specific." />
      <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="Text them at 2am, check their Instagram..." />
      <Btn onClick={() => val && onNext({ danger_behavior: val })} />
    </>
  )
}

function Step5({ onNext }: { onNext: (d: Partial<Profile>) => void }) {
  const [val, setVal] = useState('')
  return (
    <>
      <Q q="What's your biggest fear right now?" hint="Don't filter it." />
      <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="That I'll never feel this way about anyone again..." />
      <Btn onClick={() => val && onNext({ biggest_fear: val })} />
    </>
  )
}

function Step6({ onFinish }: { onFinish: (d: Partial<Profile>) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <>
      <Q q="Who's one person you can call when things get really bad?" hint="Not mutual friends. Someone fully on your side." />
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{marginBottom:10}} />
      <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
      <Btn onClick={() => name && onFinish({ contact_name: name, contact_phone: phone })} label="Start REBUILT" />
    </>
  )
}
