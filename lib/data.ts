'use client'

import { createClient } from './supabase'
import type { Checkin, Profile, StopEvent, Task, VaultEntry } from '@/types'
import { encryptVaultEntry, decryptVaultEntry } from './crypto'

// Anonymous users get a passphrase derived from their device salt (no prompt needed).
// Authenticated users can optionally set a stronger passphrase.
const ANON_PASSPHRASE = 'rebuilt-anon-local-vault'
const VAULT_PASSPHRASE_KEY = 'rebuilt_vault_passphrase'

function getVaultPassphrase(): string {
  return localStorage.getItem(VAULT_PASSPHRASE_KEY) || ANON_PASSPHRASE
}

export function setVaultPassphrase(p: string) {
  localStorage.setItem(VAULT_PASSPHRASE_KEY, p)
}

// ─── LOCAL STORAGE (anonymous) ───────────
const LS_KEY = 'rebuilt_state'

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    return JSON.parse(raw)[key] ?? fallback
  } catch { return fallback }
}

function saveLocal(key: string, value: unknown) {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const state = raw ? JSON.parse(raw) : {}
    state[key] = value
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {}
}

// ─── PROFILE ─────────────────────────────
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const local = loadLocal<Partial<Profile>>('profile', {})
    return local.breakup_date ? { id: 'anon', onboarded: true, ...local } as Profile : null
  }

  const { data } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  return data
}

export async function saveProfile(profile: Partial<Profile>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    saveLocal('profile', profile)
    return
  }
  await supabase.from('profiles').upsert({ id: user.id, ...profile })
}

// ─── CHECKINS ────────────────────────────
export async function getCheckins(): Promise<Checkin[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return loadLocal<Checkin[]>('checkins', [])

  const { data } = await supabase
    .from('checkins').select('*').order('date', { ascending: false })
  return data ?? []
}

export async function saveCheckin(checkin: Omit<Checkin, 'id' | 'user_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<Checkin[]>('checkins', [])
    const filtered = existing.filter(c => c.date !== checkin.date)
    saveLocal('checkins', [...filtered, checkin])
    return
  }
  await supabase.from('checkins').upsert(
    { user_id: user.id, ...checkin },
    { onConflict: 'user_id,date' }
  )
}

// ─── STOP EVENTS ─────────────────────────
export async function saveStopEvent(event: Omit<StopEvent, 'id' | 'user_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<StopEvent[]>('stop_events', [])
    saveLocal('stop_events', [...existing, event])
    return
  }
  await supabase.from('stop_events').insert({ user_id: user.id, ...event })
}

export async function getStopEvents(): Promise<StopEvent[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return loadLocal<StopEvent[]>('stop_events', [])

  const { data } = await supabase.from('stop_events').select('*')
  return data ?? []
}

// ─── VAULT ───────────────────────────────
export async function getVaultEntries(): Promise<VaultEntry[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return loadLocal<VaultEntry[]>('vault', [])

  const { data } = await supabase
    .from('vault_entries')
    .select('id,ciphertext,iv,burned,send_check_done,created_at')
    .eq('burned', false)
    .order('created_at', { ascending: false })

  if (!data) return []

  const passphrase = getVaultPassphrase()
  const decrypted = await Promise.all(data.map(async (entry) => {
    try {
      const content = await decryptVaultEntry(entry.ciphertext, entry.iv, passphrase)
      return { ...entry, date: entry.created_at?.slice(0,10) ?? new Date().toISOString().slice(0,10), content } as VaultEntry
    } catch {
      return { ...entry, date: entry.created_at?.slice(0,10) ?? new Date().toISOString().slice(0,10), content: '[unable to decrypt]' } as VaultEntry
    }
  }))
  return decrypted
}

export async function saveVaultEntry(content: string, existingId?: number): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<VaultEntry[]>('vault', [])
    if (existingId) {
      const updated = existing.map(e =>
        e.id === existingId ? { ...e, content } : e
      )
      saveLocal('vault', updated)
    } else {
      saveLocal('vault', [...existing, {
        id: Date.now(), content, burned: false,
        send_check_done: false, date: new Date().toISOString()
      }])
    }
    return
  }

  const passphrase = getVaultPassphrase()
  const { ciphertext, iv } = await encryptVaultEntry(content, passphrase)

  if (existingId) {
    await supabase.from('vault_entries')
      .update({ ciphertext, iv })
      .eq('id', existingId)
      .eq('user_id', user.id)
  } else {
    await supabase.from('vault_entries')
      .insert({ user_id: user.id, ciphertext, iv })
  }
}

export async function burnVaultEntry(id: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<VaultEntry[]>('vault', [])
    saveLocal('vault', existing.map(e => e.id === id ? { ...e, burned: true } : e))
    return
  }
  await supabase.from('vault_entries')
    .update({ burned: true })
    .eq('id', id).eq('user_id', user.id)
}

// ─── TASKS ───────────────────────────────
export async function getTasks(date: string): Promise<Task[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const all = loadLocal<Task[]>('tasks', [])
    return all.filter(t => t.date === date)
  }
  const { data } = await supabase
    .from('tasks').select('*').eq('date', date)
  return data ?? []
}

export async function saveTasks(tasks: Omit<Task, 'id'>[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<Task[]>('tasks', [])
    const date = tasks[0]?.date
    const filtered = existing.filter(t => t.date !== date)
    saveLocal('tasks', [...filtered, ...tasks.map((t, i) => ({ ...t, id: Date.now() + i }))])
    return
  }
  await supabase.from('tasks').insert(
    tasks.map(t => ({ ...t, user_id: user.id }))
  )
}

export async function toggleTask(id: number, done: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const existing = loadLocal<Task[]>('tasks', [])
    saveLocal('tasks', existing.map(t => t.id === id ? { ...t, done } : t))
    return
  }
  await supabase.from('tasks').update({ done }).eq('id', id).eq('user_id', user.id)
}

// ─── MIGRATION: local → cloud ────────────
export async function migrateLocalToCloud() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return
  const local = JSON.parse(raw)

  // Profile
  if (local.profile) {
    await supabase.from('profiles')
      .upsert({ id: user.id, ...local.profile, onboarded: true })
  }

  // Checkins
  if (local.checkins?.length) {
    await supabase.from('checkins').upsert(
      local.checkins.map((c: Checkin) => ({ ...c, user_id: user.id })),
      { onConflict: 'user_id,date' }
    )
  }

  // Stop events
  if (local.stop_events?.length) {
    await supabase.from('stop_events').insert(
      local.stop_events.map((e: StopEvent) => ({ ...e, user_id: user.id }))
    )
  }

  // Vault (re-encrypt with user passphrase)
  const passphrase = getVaultPassphrase()
  if (local.vault?.length) {
    for (const entry of local.vault.filter((e: VaultEntry) => !e.burned)) {
      const content = entry.content || ''
      const { ciphertext, iv } = await encryptVaultEntry(content, passphrase)
      await supabase.from('vault_entries').insert({
        user_id: user.id, ciphertext, iv,
        burned: entry.burned, send_check_done: entry.send_check_done
      })
    }
  }

  // Clear local state after successful migration
  localStorage.removeItem(LS_KEY)
}
