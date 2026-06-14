'use client'

import type { Screen } from './App'

export default function BottomNav({ active, setScreen }: { active: string; setScreen: (s: Screen) => void }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'arc',  icon: '📈', label: 'Arc'  },
    { id: 'vault',icon: '🔒', label: 'Vault' },
  ] as const

  return (
    <div style={{display:'flex',borderTop:'1px solid var(--g1)',background:'var(--black)',position:'sticky',bottom:0,zIndex:10}}>
      {items.map(({ id, icon, label }) => (
        <button key={id} onClick={() => setScreen(id)}
          style={{flex:1,padding:'12px 8px 14px',textAlign:'center',background:'none',border:'none',
            display:'flex',flexDirection:'column',alignItems:'center',gap:5,
            fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',
            color: active === id ? 'var(--red2)' : 'var(--g3)',cursor:'pointer',
          }}>
          <span style={{fontSize:17}}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}
