'use client'

import { useState } from 'react'
import type { Screen } from './App'

interface Props {
  setScreen: (s: Screen) => void
  toast: (msg: string) => void
}

export default function AuthPrompt({ setScreen, toast }: Props) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function sendLink() {
    if (!email.includes('@')) { toast('Enter a valid email.'); return }
    setLoading(true)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) {
      setSent(true)
    } else {
      toast('Something went wrong. Try again.')
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.wrap}>
        <button style={styles.back} onClick={() => setScreen('home')}>← Back</button>

        {sent ? (
          <>
            <div style={styles.logo}>Check your email</div>
            <div style={styles.body}>
              We sent a link to <strong>{email}</strong>. Tap it to sign in and your progress will sync to your account.
            </div>
            <div style={styles.hint}>No password. The link works once.</div>
          </>
        ) : (
          <>
            <div style={styles.logo}>RE<span style={{color:'var(--red2)'}}>BUILT</span></div>
            <div style={styles.body}>
              Create an account to back up your progress. Your data is encrypted and private.
            </div>
            <div style={styles.hint}>We'll send a sign-in link — no password needed.</div>
            <div style={styles.notice}>
              <div style={styles.noticeLabel}>Privacy</div>
              Your mood and check-ins are encrypted at rest. Vault entries are encrypted on your device — we cannot read them.
            </div>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{marginBottom:0}}
              onKeyDown={e => e.key === 'Enter' && sendLink()}
            />
            <button style={styles.btn} onClick={sendLink} disabled={loading}>
              {loading ? 'Sending...' : 'Send sign-in link'}
            </button>
            <button style={styles.skip} onClick={() => setScreen('home')}>
              Keep using without an account
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {display:'flex',flexDirection:'column',height:'100vh',background:'var(--black)',alignItems:'center',justifyContent:'center',padding:'40px 24px'},
  wrap: {width:'100%',maxWidth:480},
  back: {background:'none',border:'none',color:'var(--g3)',fontFamily:"'DM Mono',monospace",fontSize:12,cursor:'pointer',padding:0,marginBottom:40},
  logo: {fontFamily:"'DM Serif Display',serif",fontSize:28,letterSpacing:'0.15em',marginBottom:24},
  body: {fontSize:14,color:'var(--g4)',lineHeight:1.8,marginBottom:8},
  hint: {fontSize:12,color:'var(--g3)',marginBottom:24},
  notice: {background:'var(--g1)',border:'1px solid var(--g2)',borderRadius:6,padding:'16px 18px',marginBottom:24},
  noticeLabel: {fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--green)',marginBottom:8},
  btn: {width:'100%',padding:16,background:'var(--red)',border:'none',color:'var(--white)',fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:'0.12em',textTransform:'uppercase',borderRadius:3,marginTop:16,cursor:'pointer'},
  skip: {width:'100%',padding:14,background:'transparent',border:'1px solid var(--g2)',color:'var(--g3)',fontFamily:"'DM Mono',monospace",fontSize:12,borderRadius:3,marginTop:10,cursor:'pointer'},
}
