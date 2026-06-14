'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getProfile, migrateLocalToCloud } from '@/lib/data'
import type { Profile } from '@/types'
import Onboarding from './Onboarding'
import Home from './Home'
import StopMe from './StopMe'
import Vault from './Vault'
import { Arc, Crisis } from './ArcCrisis'
import AuthPrompt from './AuthPrompt'
import Toast from './Toast'

export type Screen = 'home' | 'stopme' | 'vault' | 'arc' | 'crisis' | 'auth'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  useEffect(() => {
    async function init() {
      // Check if returning from magic link
      const params = new URLSearchParams(window.location.search)
      if (params.get('migrated')) {
        await migrateLocalToCloud()
        window.history.replaceState({}, '', '/')
        toast('Progress saved to your account ✓')
      }

      const p = await getProfile()
      setProfile(p)
      setLoading(false)
    }

    // Listen for auth changes (sign-in / sign-out)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      const p = await getProfile()
      setProfile(p)
    })

    init()
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--g3)', fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.15em' }}>
        REBUILT
      </div>
    )
  }

  if (!profile?.onboarded) {
    return <Onboarding onComplete={(p) => setProfile(p)} toast={toast} />
  }

  return (
    <>
      {screen === 'home'    && <Home    profile={profile} setScreen={setScreen} toast={toast} />}
      {screen === 'stopme'  && <StopMe  profile={profile} setScreen={setScreen} toast={toast} />}
      {screen === 'vault'   && <Vault   setScreen={setScreen} toast={toast} />}
      {screen === 'arc'     && <Arc     profile={profile} setScreen={setScreen} />}
      {screen === 'crisis'  && <Crisis  profile={profile} setScreen={setScreen} />}
      {screen === 'auth'    && <AuthPrompt setScreen={setScreen} toast={toast} />}
      <Toast message={toastMsg} />
    </>
  )
}
