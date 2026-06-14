-- ─────────────────────────────────────────
-- REBUILT — Supabase schema + RLS policies
-- Run this in Supabase SQL editor
-- ─────────────────────────────────────────

-- Enable UUID extension (usually already on)
create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────
-- Extends auth.users with app-specific data
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  breakup_date  date,
  who_ended     text check (who_ended in ('me','them','mutual')),
  months        text,
  danger_behavior text,
  biggest_fear  text,
  contact_name  text,
  contact_phone text,
  onboarded     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can only read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can only update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── CHECK-INS ───────────────────────────
create table public.checkins (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  mood       smallint not null check (mood between 1 and 10),
  regret     text check (regret in ('yes','kinda','no')),
  commitment text,
  created_at timestamptz default now(),
  unique (user_id, date)   -- one check-in per day
);

alter table public.checkins enable row level security;

create policy "Users own their checkins"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── STOP EVENTS ─────────────────────────
create table public.stop_events (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  impulse   text not null,
  result    text check (result in ('blocked','did_it','kinda')),
  date      date not null default current_date,
  created_at timestamptz default now()
);

alter table public.stop_events enable row level security;

create policy "Users own their stop events"
  on public.stop_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── VAULT ENTRIES ───────────────────────
-- Content is AES-256 encrypted client-side.
-- Server stores ciphertext + IV only.
-- Operator cannot read vault entries.
create table public.vault_entries (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  ciphertext   text not null,   -- base64 encoded AES-GCM ciphertext
  iv           text not null,   -- base64 encoded 12-byte IV
  burned       boolean default false,
  send_check_done boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.vault_entries enable row level security;

create policy "Users own their vault entries"
  on public.vault_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── TASKS ───────────────────────────────
create table public.tasks (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  text       text not null,
  category   text,
  mandatory  boolean default false,
  done       boolean default false,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users own their tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── UPDATED_AT TRIGGER ──────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_vault_updated_at
  before update on public.vault_entries
  for each row execute function public.set_updated_at();
