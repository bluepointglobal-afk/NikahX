-- Phase 3: AI Features, Notifications, and Rate Limiting
-- Dependencies: Phase 2 migration (20260205000000_phase2_onboarding_matching.sql)

-- 1) Firasa Analysis Reports
create table if not exists public.firasa_reports (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete set null,
  
  -- Analysis results
  compatibility_score integer check (compatibility_score >= 0 and compatibility_score <= 100),
  strengths jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  recommendation text,
  full_analysis jsonb,
  
  -- Metadata
  model_version text default 'claude-sonnet-4-20250514',
  tokens_used integer,
  cost_usd numeric(6,4),
  is_paid boolean default false,
  
  created_at timestamptz default now(),
  
  constraint firasa_distinct_users check (requester_id <> subject_id)
);

create index if not exists idx_firasa_reports_requester on public.firasa_reports(requester_id);
create index if not exists idx_firasa_reports_match on public.firasa_reports(match_id);

-- 2) Mufti AI Conversations
create table if not exists public.mufti_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  madhab text, -- User's school of thought for context
  context jsonb default '{}'::jsonb, -- Additional context like location, gender
  message_count integer default 0,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mufti_conversations_user on public.mufti_conversations(user_id);

create trigger update_mufti_conversations_modtime
  before update on public.mufti_conversations
  for each row execute procedure public.update_updated_at_column();

create table if not exists public.mufti_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.mufti_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  
  -- AI response metadata
  tokens_used integer,
  model_version text,
  safety_flags text[],
  sources jsonb,
  confidence text check (confidence in ('high', 'medium', 'low')),
  
  created_at timestamptz default now()
);

create index if not exists idx_mufti_messages_conversation on public.mufti_messages(conversation_id, created_at);

-- 3) Rate Limiting Tracker
create table if not exists public.rate_limit_tracker (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  feature text not null, -- 'firasa', 'mufti', etc.
  period_type text not null check (period_type in ('daily', 'monthly')),
  period_key text not null, -- e.g., '2026-02' for monthly, '2026-02-06' for daily
  usage_count integer default 0,
  last_used_at timestamptz default now(),
  
  constraint rate_limit_unique unique (user_id, feature, period_type, period_key)
);

create index if not exists idx_rate_limit_user_feature on public.rate_limit_tracker(user_id, feature, period_key);

-- 4) Smart Match Ranking Cache
create table if not exists public.match_ranking_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  ranked_profiles jsonb not null default '[]'::jsonb, -- Array of {profile_id, score, factors}
  total_candidates integer default 0,
  computed_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours'),
  
  constraint match_ranking_unique_user unique (user_id)
);

create index if not exists idx_match_ranking_user on public.match_ranking_cache(user_id);
create index if not exists idx_match_ranking_expires on public.match_ranking_cache(expires_at);

-- 5) Notification Logs (for tracking sent notifications)
create table if not exists public.notification_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  notification_type text not null, -- 'match', 'message', 'wali_reminder', 'digest'
  channel text not null, -- 'email', 'push', 'sms'
  reference_id uuid, -- match_id, message_id, etc.
  status text default 'sent' check (status in ('sent', 'failed', 'bounced')),
  error_message text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_notification_logs_user on public.notification_logs(user_id, created_at desc);
create index if not exists idx_notification_logs_type on public.notification_logs(notification_type, created_at desc);

-- 6) User Presence (for online/offline status)
create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean default false,
  last_seen_at timestamptz default now(),
  push_token text, -- FCM or OneSignal token
  push_provider text check (push_provider in ('fcm', 'onesignal', 'apns'))
);

create index if not exists idx_user_presence_online on public.user_presence(is_online) where is_online = true;

-- 7) Currency & Mahr Cache (for mahr calculator)
create table if not exists public.currency_cache (
  id uuid primary key default uuid_generate_v4(),
  base_currency text not null default 'USD',
  rates jsonb not null, -- {SAR: 3.75, AED: 3.67, ...}
  gold_price_usd numeric(10,2), -- per troy ounce
  silver_price_usd numeric(10,2), -- per troy ounce
  fetched_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- 8) RLS Policies

-- firasa_reports
alter table public.firasa_reports enable row level security;

drop policy if exists "firasa_select_own" on public.firasa_reports;
create policy "firasa_select_own"
  on public.firasa_reports for select
  using (auth.uid() = requester_id or auth.uid() = subject_id);

drop policy if exists "firasa_insert_requester" on public.firasa_reports;
create policy "firasa_insert_requester"
  on public.firasa_reports for insert
  with check (auth.uid() = requester_id);

-- mufti_conversations
alter table public.mufti_conversations enable row level security;

drop policy if exists "mufti_conv_select_own" on public.mufti_conversations;
create policy "mufti_conv_select_own"
  on public.mufti_conversations for select
  using (auth.uid() = user_id);

drop policy if exists "mufti_conv_insert_own" on public.mufti_conversations;
create policy "mufti_conv_insert_own"
  on public.mufti_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "mufti_conv_update_own" on public.mufti_conversations;
create policy "mufti_conv_update_own"
  on public.mufti_conversations for update
  using (auth.uid() = user_id);

-- mufti_messages
alter table public.mufti_messages enable row level security;

drop policy if exists "mufti_msg_select_own" on public.mufti_messages;
create policy "mufti_msg_select_own"
  on public.mufti_messages for select
  using (
    exists (
      select 1 from public.mufti_conversations mc
      where mc.id = conversation_id and mc.user_id = auth.uid()
    )
  );

drop policy if exists "mufti_msg_insert_own" on public.mufti_messages;
create policy "mufti_msg_insert_own"
  on public.mufti_messages for insert
  with check (
    exists (
      select 1 from public.mufti_conversations mc
      where mc.id = conversation_id and mc.user_id = auth.uid()
    )
  );

-- rate_limit_tracker (service role only for writes, user can read own)
alter table public.rate_limit_tracker enable row level security;

drop policy if exists "rate_limit_select_own" on public.rate_limit_tracker;
create policy "rate_limit_select_own"
  on public.rate_limit_tracker for select
  using (auth.uid() = user_id);

-- match_ranking_cache (service role for writes, user can read own)
alter table public.match_ranking_cache enable row level security;

drop policy if exists "ranking_select_own" on public.match_ranking_cache;
create policy "ranking_select_own"
  on public.match_ranking_cache for select
  using (auth.uid() = user_id);

-- notification_logs (user can see their own)
alter table public.notification_logs enable row level security;

drop policy if exists "notif_log_select_own" on public.notification_logs;
create policy "notif_log_select_own"
  on public.notification_logs for select
  using (auth.uid() = user_id);

-- user_presence (user can manage their own)
alter table public.user_presence enable row level security;

drop policy if exists "presence_select_own" on public.user_presence;
create policy "presence_select_own"
  on public.user_presence for select
  using (auth.uid() = user_id);

drop policy if exists "presence_upsert_own" on public.user_presence;
create policy "presence_upsert_own"
  on public.user_presence for insert
  with check (auth.uid() = user_id);

drop policy if exists "presence_update_own" on public.user_presence;
create policy "presence_update_own"
  on public.user_presence for update
  using (auth.uid() = user_id);

-- 9) Helper Functions

-- Check if user is premium
create or replace function public.is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select is_premium from public.profiles where id = p_user_id),
    false
  );
$$;

-- Get rate limit usage for a feature
create or replace function public.get_rate_limit_usage(
  p_user_id uuid,
  p_feature text,
  p_period_type text,
  p_period_key text
)
returns integer
language sql
stable
security definer
as $$
  select coalesce(
    (select usage_count from public.rate_limit_tracker
     where user_id = p_user_id 
       and feature = p_feature 
       and period_type = p_period_type
       and period_key = p_period_key),
    0
  );
$$;

-- Increment rate limit usage (for service role)
create or replace function public.increment_rate_limit(
  p_user_id uuid,
  p_feature text,
  p_period_type text,
  p_period_key text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_new_count integer;
begin
  insert into public.rate_limit_tracker (user_id, feature, period_type, period_key, usage_count, last_used_at)
  values (p_user_id, p_feature, p_period_type, p_period_key, 1, now())
  on conflict (user_id, feature, period_type, period_key)
  do update set 
    usage_count = rate_limit_tracker.usage_count + 1,
    last_used_at = now()
  returning usage_count into v_new_count;
  
  return v_new_count;
end;
$$;

-- Get pending wali matches older than threshold
create or replace function public.get_pending_wali_matches(p_hours_threshold integer default 24)
returns table(
  match_id uuid,
  user1_id uuid,
  user2_id uuid,
  user1_name text,
  user2_name text,
  user1_email text,
  user2_email text,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select 
    m.id as match_id,
    m.user1_id,
    m.user2_id,
    p1.full_name as user1_name,
    p2.full_name as user2_name,
    p1.email as user1_email,
    p2.email as user2_email,
    m.created_at
  from public.matches m
  join public.profiles p1 on p1.id = m.user1_id
  join public.profiles p2 on p2.id = m.user2_id
  where m.status = 'pending_wali'
    and m.is_active = true
    and m.created_at < (now() - (p_hours_threshold || ' hours')::interval);
$$;
