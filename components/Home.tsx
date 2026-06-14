'use client'

import { useEffect, useState, useCallback } from 'react'
import { getCheckins, saveCheckin, getTasks, saveTasks, toggleTask } from '@/lib/data'
import type { Profile, Checkin, Task } from '@/types'
import type { Screen } from './App'
import BottomNav from './BottomNav'

const TASK_LIBRARY: Record<number, { text: string; cat: string; m: boolean }[]> = {
  1:  [{text:"Eat one real meal today — anything counts.",cat:'survival',m:true},{text:"Drink 2L of water.",cat:'survival',m:false},{text:"Tell one person you trust that you're having a hard time.",cat:'social',m:false}],
  2:  [{text:"Go outside for 10 minutes, even if just the doorstep.",cat:'survival',m:true},{text:"Sleep before 1am tonight.",cat:'survival',m:false},{text:"Put your phone in another room for one hour.",cat:'practical',m:false}],
  3:  [{text:"Shower. Get dressed. That's the full task.",cat:'survival',m:true},{text:"Text one friend who is NOT mutual.",cat:'social',m:false},{text:"Write in the Vault instead of texting them.",cat:'practical',m:false}],
  5:  [{text:"Move your body for 15 minutes — anything.",cat:'survival',m:true},{text:"Remove them from Find My Friends.",cat:'practical',m:false},{text:"Do one thing you've been putting off.",cat:'forward',m:false}],
  7:  [{text:"Call or voice memo a friend — not text.",cat:'social',m:true},{text:"Archive (don't delete) your photos of them.",cat:'practical',m:false},{text:"Write down one thing you missed doing while in the relationship.",cat:'forward',m:false}],
  14: [{text:"Write down one thing you want in your next relationship.",cat:'forward',m:true},{text:"Delete or archive the text thread.",cat:'practical',m:false},{text:"Do something you've never done before.",cat:'forward',m:false}],
}

function today() { return new Date().toISOString().slice(0, 10) }
function daysSince(d: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) + 1)
}
function getTaskKey(day: number) {
  return [14, 7, 5, 3, 2, 1].find(k => day >= k) ?? 1
}

interface Props {
  profile: Profile
  setScreen: (s: Screen) => void
  toast: (msg: string) => void
}

export default function Home({ profile, setScreen, toast }: Props) {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [mood, setMood] = useState(5)
  const [regret, setRegret] = useState<'yes'|'kinda'|'no'|null>(null)
  const [commitment, setCommitment] = useState('')

  const day = daysSince(profile.breakup_date!)
  const todayStr = today()
  const todayCI = checkins.find(c => c.date === todayStr)

  const load = useCallback(async () => {
    const [ci, t] = await Promise.all([getCheckins(), getTasks(todayStr)])
    setCheckins(ci)

    if (t.length > 0) {
      setTasks(t)
    } else {
      // Generate today's tasks
      const key = getTaskKey(day)
      const templates = TASK_LIBRARY[key] ?? TASK_LIBRARY[1]
      const newTasks = templates.map((t, i) => ({
        id: Date.now() + i, date: todayStr,
        text: t.text, category: t.cat, mandatory: t.m, done: false
      }))
      await saveTasks(newTasks.map(({ id: _, ...rest }) => rest))
      setTasks(newTasks)
    }
  }, [todayStr, day])

  useEffect(() => { load() }, [load])

  async function handleCheckin() {
    if (!commitment.trim()) { toast('Add your commitment first.'); return }
    const ci: Omit<Checkin, 'id'|'user_id'> = {
      date: todayStr, mood, regret: regret ?? 'no', commitment
    }
    await saveCheckin(ci)
    setCheckins(prev => [...prev.filter(c => c.date !== todayStr), ci as Checkin])
    toast('Check-in saved ✓')
  }

  async function handleToggleTask(id: number, done: boolean) {
    await toggleTask(id, done)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    if (done) toast('✓ Task completed')
  }

  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>RE<span style={{color:'var(--red2)'}}>BUILT</span></div>
          <div style={styles.dayPill}>
            <span style={styles.dayText}>Day {day} of 30</span>
          </div>
        </div>
        <button style={styles.crisisBtn} onClick={() => setScreen('crisis')} title="Crisis mode">🆘</button>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Stop Me Hero */}
        <button style={styles.stopme} onClick={() => setScreen('stopme')}>
          <div style={styles.stopmeInner}>
            <div style={styles.stopmeEye}>Impulse intercept</div>
            <div style={styles.stopmeHead}>Stop <em style={{color:'var(--red2)',fontStyle:'normal'}}>me.</em></div>
            <div style={styles.stopmeSub}>Tap before you do something you'll regret.</div>
            <span style={styles.stopmeArrow}>→</span>
          </div>
        </button>

        {/* Check-in card */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Daily check-in</div>
          {todayCI ? (
            <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={styles.doneCheck}>✓</div>
              <div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,marginBottom:6}}>Done for today.</div>
                <div style={{fontSize:12,color:'var(--g3)',fontStyle:'italic',lineHeight:1.6}}>"{todayCI.commitment}"</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:21,marginBottom:14}}>How are you right now?</div>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:48}}>{mood}</div>
                <div style={{position:'relative',height:6,background:'var(--g2)',borderRadius:3,margin:'12px 0 8px'}}>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,var(--red),var(--amber),var(--green))',borderRadius:3}}/>
                  <input type="range" min={1} max={10} value={mood}
                    onChange={e => setMood(+e.target.value)}
                    style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:0,width:'100%',WebkitAppearance:'none',background:'transparent',cursor:'pointer'}}
                  />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:18}}>
                  <span>😞</span><span>😐</span><span>🙂</span><span>😌</span>
                </div>
              </div>
              <div style={{fontSize:13,color:'var(--g4)',lineHeight:1.85,marginTop:16,marginBottom:10}}>Did you do anything you regret yesterday?</div>
              <div style={{display:'flex',gap:10}}>
                {(['yes','kinda','no'] as const).map(r => (
                  <button key={r} onClick={() => setRegret(r)}
                    style={{...styles.choiceBtn, ...(regret===r ? styles.choiceSel : {})}}>
                    {r === 'kinda' ? 'Kind of' : r.charAt(0).toUpperCase()+r.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{marginTop:20}}>
                <div style={{fontSize:13,color:'var(--g4)',marginBottom:8}}>One commitment for today:</div>
                <input type="text" value={commitment} onChange={e => setCommitment(e.target.value)}
                  placeholder="I will not check their profile today." />
              </div>
              <button style={styles.btn} onClick={handleCheckin}>Save check-in</button>
            </>
          )}
        </div>

        {/* Tasks */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Today's tasks</div>
          {tasks.map(t => (
            <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div onClick={() => handleToggleTask(t.id, !t.done)}
                style={{...styles.taskCheck, ...(t.done ? styles.taskDone : {})}}>
                {t.done ? '✓' : ''}
              </div>
              <div>
                <div style={{fontSize:13,lineHeight:1.7,textDecoration:t.done?'line-through':'none',color:t.done?'var(--g3)':'inherit'}}>
                  {t.text}
                </div>
                <span style={{...styles.badge, ...(t.mandatory ? styles.badgeReq : styles.badgeOpt)}}>
                  {t.mandatory ? 'Required' : 'Bonus'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" setScreen={setScreen} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {display:'flex',flexDirection:'column',height:'100vh',background:'var(--black)',overflowY:'auto'},
  header: {padding:'18px 24px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--black)',zIndex:10,borderBottom:'1px solid var(--g1)'},
  logo: {fontFamily:"'DM Serif Display',serif",fontSize:19,letterSpacing:'0.12em'},
  dayPill: {display:'inline-flex',alignItems:'center',background:'var(--g1)',border:'1px solid var(--g2)',padding:'4px 10px',borderRadius:20,marginTop:5},
  dayText: {fontSize:10,color:'var(--g3)',letterSpacing:'0.18em',textTransform:'uppercase'},
  crisisBtn: {background:'none',border:'1px solid var(--g2)',color:'var(--g3)',fontSize:13,padding:'7px 9px',borderRadius:6,lineHeight:1},
  body: {padding:'20px 20px 28px',flex:1,display:'flex',flexDirection:'column',gap:14},
  stopme: {width:'100%',background:'none',border:'none',padding:0,borderRadius:12,overflow:'hidden',cursor:'pointer',textAlign:'left',boxShadow:'0 2px 24px rgba(192,57,43,0.18)'},
  stopmeInner: {background:'linear-gradient(135deg,#1a0808 0%,#2a0d0d 60%,#1f1010 100%)',border:'1px solid rgba(192,57,43,0.35)',padding:'28px 28px 24px',position:'relative'},
  stopmeEye: {fontSize:9,letterSpacing:'0.28em',textTransform:'uppercase',color:'rgba(231,76,60,0.6)',marginBottom:10,fontFamily:"'DM Mono',monospace"},
  stopmeHead: {fontFamily:"'DM Serif Display',serif",fontSize:34,letterSpacing:'0.02em',lineHeight:1},
  stopmeSub: {fontSize:11,color:'rgba(204,204,204,0.45)',marginTop:10,letterSpacing:'0.06em'},
  stopmeArrow: {position:'absolute',right:24,bottom:24,fontSize:22,color:'var(--red2)',opacity:0.7},
  card: {background:'var(--off)',border:'1px solid var(--g1)',borderRadius:10,padding:'22px 22px 20px'},
  cardLabel: {fontSize:9,letterSpacing:'0.24em',textTransform:'uppercase',color:'var(--red2)',marginBottom:14,opacity:0.85},
  doneCheck: {width:28,height:28,borderRadius:'50%',background:'rgba(76,175,125,0.12)',border:'1px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green)',fontSize:13,flexShrink:0,marginTop:2},
  choiceBtn: {flex:1,padding:'12px 8px',background:'var(--g1)',border:'1px solid var(--g2)',color:'var(--white)',borderRadius:3,fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:'center'},
  choiceSel: {borderColor:'var(--red)',color:'var(--red2)',background:'rgba(192,57,43,0.1)'},
  btn: {width:'100%',padding:16,background:'var(--red)',border:'none',color:'var(--white)',fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:'0.12em',textTransform:'uppercase',borderRadius:3,marginTop:16},
  taskCheck: {width:22,height:22,border:'1px solid var(--g2)',borderRadius:'50%',cursor:'pointer',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11},
  taskDone: {background:'var(--green)',borderColor:'var(--green)',color:'var(--black)'},
  badge: {fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',padding:'2px 7px',borderRadius:2,marginTop:4,display:'inline-block'},
  badgeReq: {background:'rgba(192,57,43,0.12)',color:'rgba(231,76,60,0.7)'},
  badgeOpt: {background:'rgba(212,168,71,0.08)',color:'rgba(212,168,71,0.6)'},
}
