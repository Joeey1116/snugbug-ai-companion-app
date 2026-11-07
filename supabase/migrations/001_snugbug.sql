-- Snugbug — initial schema (001).
-- Run once in the Supabase dashboard SQL Editor (or `supabase db push`).
-- Tables the app + the snugbug-chat Edge Function need.
-- NOTE: run this BEFORE deploying the Edge Function; the function
-- fails open without these tables, but metering only works with them.

-- Profiles: one row per auth user. Created by the app's ensureProfile
-- (upsert on sign-in / sign-up / confirmation).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  companion_name text default 'Snugbug',
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat history: one row per message, written server-side by
-- snugbug-chat (service role). The app keeps its own on-device copy
-- too; this is the cross-device record.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Allowance ledger: one row per AI reply, written server-side by
-- snugbug-chat from Gemini usage_metadata. The weekly budget is
-- enforced from the SUM of input_tokens + output_tokens for the
-- current week (week_start = Monday, UTC).
create table if not exists public.allowance_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists allowance_ledger_user_week_idx
  on public.allowance_ledger (user_id, week_start);
create index if not exists allowance_ledger_user_created_idx
  on public.allowance_ledger (user_id, created_at);

-- Companion state: house/garden growth, per account. The app also
-- caches this locally (AsyncStorage) and syncs it here when configured.
create table if not exists public.companion_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  care_points integer not null default 0,
  chat_count integer not null default 0,
  streak_days integer not null default 0,
  last_chat_date date,
  unlocked text[] not null default '{}',
  garden_level integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Row Level Security: users can only read their OWN rows. Writes to
-- chat_messages / allowance_ledger happen via the service-role key in
-- the Edge Function (bypasses RLS); the app writes only its own
-- profile + companion_state rows.
alter table public.profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.allowance_ledger enable row level security;
alter table public.companion_state enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own chat history" on public.chat_messages;
create policy "own chat history" on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "own allowance" on public.allowance_ledger;
create policy "own allowance" on public.allowance_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "own companion" on public.companion_state;
create policy "own companion" on public.companion_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
