'use client'

import { useEffect, useState, useCallback } from 'react'
import { getVaultEntries, saveVaultEntry, burnVaultEntry } from '@/lib/data'
import type { VaultEntry } from '@/types'
import type { Screen } from './App'
import BottomNav from './BottomNav'

interface Props { setScreen: (s: Screen) => void; toast: (msg: string) => void }

export default function Vault({ setScreen, toast }: Props) {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [editing, setEditing] = useState<VaultEntry | null>(null)
  const [text, setText] = useState('')

  const load = useCallback(async () => {
    setEntries(await getVaultEntries())
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!text.trim()) return
    await saveVaultEntry(text, editing?.id)
    toast('Saved ✓')
    setText('')
    setEditing(null)
    load()
  }

  async function burn() {
    if (!editing?.id) return
    if (!confirm('Burn this entry? This can\'t be undone.')) return
    await burnVaultEntry(editing.id)
    toast('🔥 Entry burned.')
    setText('')
    setEditing(null)
    load()
  }

  if (editing !== null || text !== '') {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#0a0a0f'}}>
        <div style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={() => { setText(''); setEditing(null) }} style={btnStyle}>← Close</button>
          <div style={{display:'flex',gap:12}}>
            {editing?.id && <button onClick={burn} style={{...btnStyle,color:'var(--red2)'}}>🔥 Burn</button>}
            <button onClick={save} style={{...btnStyle,background:'var(--red)',color:'var(--white)',padding:'6px 14px',borderRadius:3}}>Save</button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Say what you need to say. It goes nowhere."
          autoFocus
          style={{flex:1,width:'100%',background:'transparent',border:'none',color:'var(--g4)',padding:'32px 28px',fontFamily:"'DM Mono',monospace",fontSize:14,lineHeight:2,resize:'none',outline:'none'}}
        />
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--black)'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid var(--g1)',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--black)',zIndex:5}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20}}>The Vault</div>
        <button onClick={() => { setEditing({} as VaultEntry); setText('') }} style={{...btnStyle,background:'var(--red)',color:'var(--white)',padding:'10px 18px',borderRadius:3,fontSize:11}}>+ New entry</button>
      </div>
      <div style={{padding:'16px 24px',flex:1,overflowY:'auto'}}>
        <div style={{fontSize:11,color:'var(--g3)',letterSpacing:'0.1em',marginBottom:20}}>Everything here stays here. Always.</div>
        {entries.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--g3)'}}>
            <div style={{fontSize:32}}>🔒</div>
            <p style={{fontSize:13,marginTop:12}}>Nothing here yet.<br/>Write what you can't send.</p>
          </div>
        ) : entries.map(e => (
          <div key={e.id} onClick={() => { setEditing(e); setText(e.content ?? '') }}
            style={{background:'var(--off)',border:'1px solid var(--g1)',borderRadius:6,padding:18,marginBottom:12,cursor:'pointer'}}>
            <div style={{fontSize:13,color:'var(--g4)',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:1.7}}>
              {e.content}
            </div>
            <div style={{fontSize:10,color:'var(--g3)',letterSpacing:'0.1em',marginTop:8}}>
              {new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="vault" setScreen={setScreen} />
    </div>
  )
}

const btnStyle: React.CSSProperties = {background:'none',border:'none',color:'var(--g3)',fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:'0.1em',padding:'6px 12px',borderRadius:3,cursor:'pointer'}
