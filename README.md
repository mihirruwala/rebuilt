# REBUILT

A 30-day breakup recovery companion. Helps users intercept self-destructive impulses, check in daily, and process what they can't send.

Stack: **Next.js + Vercel** (serverless) · **Supabase** (Postgres + Auth + RLS) · **Anthropic API** (server-side only)

---

## Privacy model

| Data | Where | Who can read it |
|------|-------|-----------------|
| Anonymous session | `localStorage` only | Device only — nothing hits the server |
| Profile, check-ins, stop events | Supabase (encrypted at rest) | User only — Row Level Security enforced at DB layer |
| Vault entries | Supabase — **ciphertext only** | **Nobody but the user** (AES-256-GCM, client-side) |
| AI prompts (Stop Me) | Sent to Anthropic, not stored by us | Anthropic per their data policy |

The Anthropic API key never reaches the browser. All AI calls go through `/api/stop-me`.

---

## Setup

### 1. Install
```bash
git clone https://github.com/you/rebuilt.git && cd rebuilt && npm install
```

### 2. Supabase
Create a project at [supabase.com](https://supabase.com). In the SQL editor, run `supabase/schema.sql`.

Enable **Magic Link** auth: Dashboard → Authentication → Providers → Email.

Add redirect URL: `http://localhost:3000/auth/callback` (and your prod URL).

### 3. Environment
```bash
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

### 4. Run
```bash
npm run dev
```

### 5. Deploy
```bash
npx vercel
# Set same env vars in Vercel dashboard
```

---

## Structure

```
app/
  api/stop-me/route.ts    AI impulse intercept — streams SSE, key server-side only
  api/auth/route.ts       Magic link send
  auth/callback/route.ts  Magic link exchange → session cookie
components/
  App.tsx                 Root: auth state, screen routing, migration
  Home.tsx                Daily check-in, tasks, Stop Me hero
  StopMe.tsx              Impulse intercept flow + AI
  Vault.tsx               Encrypted journal
  ArcCrisis.tsx           Recovery chart + crisis mode
  Onboarding.tsx          6-step intake
  AuthPrompt.tsx          Magic link sign-in
lib/
  data.ts                 All reads/writes (anon localStorage ↔ Supabase)
  crypto.ts               AES-256-GCM vault encryption (Web Crypto API)
  supabase.ts             Browser + server Supabase clients
supabase/schema.sql       DB schema + RLS policies (run once)
```

---

## Rate limiting

`/api/stop-me` uses simple in-memory rate limiting (10 req/user/hour). For production scale, replace with [Upstash Redis](https://upstash.com).

## PWA

The app installs on iOS/Android via "Add to Home Screen". Works offline (localStorage fallback). For native React Native, `lib/data.ts` and `lib/crypto.ts` are reusable as-is.
