export interface Profile {
  id: string
  breakup_date: string | null
  who_ended: 'me' | 'them' | 'mutual' | null
  months: string | null
  danger_behavior: string | null
  biggest_fear: string | null
  contact_name: string | null
  contact_phone: string | null
  onboarded: boolean
}

export interface Checkin {
  id?: number
  user_id?: string
  date: string
  mood: number
  regret: 'yes' | 'kinda' | 'no'
  commitment: string
}

export interface StopEvent {
  id?: number
  user_id?: string
  impulse: string
  result: 'blocked' | 'did_it' | 'kinda'
  date: string
}

// Vault entries — content is encrypted before hitting the server.
// The app layer only ever sees plaintext; the network/DB only sees ciphertext.
export interface VaultEntry {
  id?: number
  date: string
  burned: boolean
  send_check_done: boolean
  // Plaintext (only in memory, never persisted directly)
  content?: string
  // Encrypted fields (what gets stored)
  ciphertext?: string
  iv?: string
}

export interface Task {
  id: number
  date: string
  text: string
  category: string
  mandatory: boolean
  done: boolean
}

// Anonymous state — stored in localStorage, same shape as DB
export interface LocalState {
  profile: Omit<Profile, 'id'>
  checkins: Checkin[]
  stop_events: StopEvent[]
  vault: VaultEntry[]   // plaintext in localStorage (no account = local risk)
  tasks: Task[]
}
