'use client'

const ITERATIONS = 200_000
const SALT_KEY = 'rebuilt_vault_salt'

function getOrCreateSalt(): ArrayBuffer {
  const stored = localStorage.getItem(SALT_KEY)
  if (stored) {
    const arr = new Uint8Array(JSON.parse(stored))
    return arr.buffer as ArrayBuffer
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(SALT_KEY, JSON.stringify(Array.from(salt)))
  return salt.buffer as ArrayBuffer
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt()
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptVaultEntry(
  plaintext: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptVaultEntry(
  ciphertext: string,
  iv: string,
  passphrase: string
): Promise<string> {
  const key = await deriveKey(passphrase)
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  const ctBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ctBytes
  )
  return new TextDecoder().decode(decrypted)
}
