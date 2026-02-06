-- Phase 2 MVP: Onboarding fields + privacy-first matching w/ wali involvement
-- Canonical schema assumed: profiles/swipes/matches/messages from 20240101000000_init.sql

-- 1) Onboarding: sharia-compliant profile questions
alter table public.profiles
  add column if not exists education_level text,
  add column if not exists education_field text,
  add column if not exists occupation text,
  add column if not exists religiosity_level text,
  add column if not exists prayer_frequency text,
  add column if not exists halal_diet boolean,
  add column if not exists smoking text,
  add column if not exists languages text[],
  add column if not exists marital_status text,
  add column if not exists wants_children boolean,
  add column if not exists onboarding_completed_at timestamptz;

-- Basic value constraints (soft enums)
alter table public.profiles
  add constraint profiles_religiosity_level_check
  check (religiosity_level is null or religiosity_level in ('low','moderate','high'));

alter table public.profiles
  add constraint profiles_prayer_frequency_check
  check (prayer_frequency is null or prayer_frequency in ('never','sometimes','often','always'));

alter table public.profiles
  add constraint profiles_smoking_check
  check (smoking is null or smoking in ('no','occasionally','yes'));

alter table public.profiles
  add constraint profiles_marital_status_check
  check (marital_status is null or marital_status in ('never_married','divorced','widowed'));

-- 2) Preferences (separate table for future expansion)
create table if not exists public.preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  min_age int not null default 18,
  max_age int not null default 60,
  distance_km int not null default 50,
  preferred_sect text,
  preferred_religiosity_level text,
  education_min_level text,
  allow_international boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint preferences_age_range_check check (min_age >= 18 and max_age >= min_age)
);

create trigger update_preferences_modtime
  before update on public.preferences
  for each row execute procedure public.update_updated_at_column();

-- 3) Wali / Guardian involvement
do $$
begin
  if not exists (select 1 from pg_type where typname = 'wali_link_status_enum') then
    create type public.wali_link_status_enum as enum ('pending','active','rejected','revoked');
  end if;
end
$$;

create table if not exists public.wali_links (
  id uuid primary key default uuid_generate_v4(),
  ward_id uuid references public.profiles(id) on delete cascade not null,
  wali_user_id uuid references public.profiles(id) on delete cascade,
  wali_contact text not null,
  invite_code text unique not null,
  status public.wali_link_status_enum not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint wali_links_distinct_users_check check (wali_user_id is null or wali_user_id <> ward_id)
);

create index if not exists idx_wali_links_ward on public.wali_links(ward_id);
create index if not exists idx_wali_links_wali on public.wali_links(wali_user_id);

create trigger update_wali_links_modtime
  before update on public.wali_links
  for each row execute procedure public.update_updated_at_column();

-- Helper: does a ward have an active wali?
create or replace function public.has_active_wali(p_ward_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.wali_links wl
    where wl.ward_id = p_ward_id and wl.status = 'active'
  );
$$;

-- 4) Match workflow: pending wali approvals + no photos until mutual consent
do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_status_enum') then
    create type public.match_status_enum as enum ('pending_wali','active','rejected','cancelled');
  end if;
end
$$;

alter table public.matches
  add column if not exists status public.match_status_enum not null default 'pending_wali',
  add column if not exists wali_approved_user1_at timestamptz,
  add column if not exists wali_approved_user2_at timestamptz,
  add column if not exists consented_at timestamptz,
  add column if not exists photos_unlocked_at timestamptz;

-- 5) RPCs

-- Create/Upsert preference in one call
create or replace function public.upsert_preferences(
  p_min_age int,
  p_max_age int,
  p_distance_km int,
  p_preferred_sect text,
  p_preferred_religiosity_level text,
  p_education_min_level text,
  p_allow_international boolean
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.preferences(user_id, min_age, max_age, distance_km, preferred_sect, preferred_religiosity_level, education_min_level, allow_international)
  values (v_uid, p_min_age, p_max_age, p_distance_km, p_preferred_sect, p_preferred_religiosity_level, p_education_min_level, coalesce(p_allow_international,false))
  on conflict (user_id) do update set
    min_age = excluded.min_age,
    max_age = excluded.max_age,
    distance_km = excluded.distance_km,
    preferred_sect = excluded.preferred_sect,
    preferred_religiosity_level = excluded.preferred_religiosity_level,
    education_min_level = excluded.education_min_level,
    allow_international = excluded.allow_international,
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

-- Discovery feed (privacy-first): returns a minimal profile card.
-- IMPORTANT: No photos here; photos are unlocked only after mutual consent.
create or replace function public.get_discovery_feed(p_limit int default 20)
returns table(
  id uuid,
  full_name text,
  gender public.gender_enum,
  dob date,
  country text,
  city text,
  sect text,
  religiosity_level text,
  education_level text
)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_self public.profiles%rowtype;
  v_pref public.preferences%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_self from public.profiles where id = v_uid;
  if v_self is null then
    raise exception 'Profile not found';
  end if;

  -- Must have an active wali before browsing
  if not public.has_active_wali(v_uid) then
    raise exception 'Wali required before discovery';
  end if;

  select * into v_pref from public.preferences where user_id = v_uid;

  return query
  select
    p.id,
    p.full_name,
    p.gender,
    p.dob,
    p.country,
    p.city,
    p.sect,
    p.religiosity_level,
    p.education_level
  from public.profiles p
  where p.id <> v_uid
    and p.is_suspended = false
    -- Opposite gender only
    and p.gender <> v_self.gender
    -- Must also have active wali (no mixed-gender free browsing; wali oversight for both)
    and public.has_active_wali(p.id)
    -- Exclude already swiped
    and not exists (
      select 1 from public.swipes s
      where s.actor_id = v_uid and s.target_id = p.id
    )
    -- Simple preference filters
    and (
      v_pref is null
      or (
        date_part('year', age(current_date, p.dob)) between v_pref.min_age and v_pref.max_age
        and (v_pref.preferred_sect is null or p.sect = v_pref.preferred_sect)
        and (v_pref.preferred_religiosity_level is null or p.religiosity_level = v_pref.preferred_religiosity_level)
      )
    )
  order by p.created_at desc
  limit greatest(1, least(p_limit, 50));
end;
$$;

-- Like/pass interaction, but match remains pending until wali approvals
create or replace function public.create_interaction_v2(target_user_id uuid, interaction_type text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_self public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_reverse swipes%rowtype;
  v_match_id uuid;
  v_user1 uuid;
  v_user2 uuid;
  v_mutual boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_uid = target_user_id then
    raise exception 'Cannot swipe yourself';
  end if;

  -- Must have active wali before any interaction
  if not public.has_active_wali(v_uid) then
    raise exception 'Wali required before interactions';
  end if;

  select * into v_self from public.profiles where id = v_uid;
  select * into v_target from public.profiles where id = target_user_id;
  if v_target is null then
    raise exception 'Target not found';
  end if;

  -- Opposite gender only
  if v_self.gender = v_target.gender then
    raise exception 'Not permitted';
  end if;

  -- Target must also have a wali to proceed (reduces mixed-gender browsing outside oversight)
  if not public.has_active_wali(target_user_id) then
    raise exception 'Target wali required';
  end if;

  insert into public.swipes(actor_id, target_id, action)
  values (v_uid, target_user_id, interaction_type)
  on conflict (actor_id, target_id) do update set action = excluded.action;

  if interaction_type = 'like' then
    select * into v_reverse
    from public.swipes
    where actor_id = target_user_id and target_id = v_uid and action = 'like';

    if v_reverse is not null then
      v_mutual := true;

      -- stable ordering
      if v_uid < target_user_id then
        v_user1 := v_uid;
        v_user2 := target_user_id;
      else
        v_user1 := target_user_id;
        v_user2 := v_uid;
      end if;

      insert into public.matches(user1_id, user2_id, status)
      values (v_user1, v_user2, 'pending_wali')
      on conflict do nothing
      returning id into v_match_id;

      if v_match_id is null then
        select id into v_match_id from public.matches
        where user1_id = v_user1 and user2_id = v_user2 and is_active = true
        limit 1;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'is_mutual', v_mutual,
    'match_id', v_match_id,
    'status', case when v_mutual then 'pending_wali' else null end
  );
end;
$$;

-- Wali approves/rejects a pending match for their ward.
create or replace function public.wali_decide_match(p_match_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_ward_id uuid;
  v_is_wali boolean;
  v_other_approved boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_decision not in ('approve','reject') then
    raise exception 'Invalid decision';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match is null then
    raise exception 'Match not found';
  end if;
  if v_match.status <> 'pending_wali' then
    raise exception 'Match not pending wali';
  end if;

  -- Determine which ward this wali is linked to in this match
  select wl.ward_id into v_ward_id
  from public.wali_links wl
  where wl.wali_user_id = v_uid
    and wl.status = 'active'
    and wl.ward_id in (v_match.user1_id, v_match.user2_id)
  limit 1;

  v_is_wali := v_ward_id is not null;
  if not v_is_wali then
    raise exception 'Not authorized as wali';
  end if;

  if p_decision = 'reject' then
    update public.matches
      set status = 'rejected',
          is_active = false,
          unmatched_by = v_uid
    where id = p_match_id;

    return jsonb_build_object('success', true, 'status', 'rejected');
  end if;

  -- approve
  if v_ward_id = v_match.user1_id then
    update public.matches set wali_approved_user1_at = now() where id = p_match_id;
  else
    update public.matches set wali_approved_user2_at = now() where id = p_match_id;
  end if;

  select (wali_approved_user1_at is not null and wali_approved_user2_at is not null)
    into v_other_approved
  from public.matches where id = p_match_id;

  if v_other_approved then
    update public.matches
      set status = 'active'
    where id = p_match_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'status', case when v_other_approved then 'active' else 'pending_wali' end
  );
end;
$$;

-- 6) RLS
alter table public.preferences enable row level security;
alter table public.wali_links enable row level security;

-- preferences: self only
drop policy if exists "preferences_select_own" on public.preferences;
create policy "preferences_select_own"
  on public.preferences for select
  using (auth.uid() = user_id);

drop policy if exists "preferences_insert_own" on public.preferences;
create policy "preferences_insert_own"
  on public.preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "preferences_update_own" on public.preferences;
create policy "preferences_update_own"
  on public.preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- wali_links:
-- Ward can create an invite for themselves
drop policy if exists "wali_links_insert_own" on public.wali_links;
create policy "wali_links_insert_own"
  on public.wali_links for insert
  with check (auth.uid() = ward_id);

-- Ward can see their own wali links
drop policy if exists "wali_links_select_own" on public.wali_links;
create policy "wali_links_select_own"
  on public.wali_links for select
  using (auth.uid() = ward_id);

-- Wali can see links where they are assigned
drop policy if exists "wali_links_select_as_wali" on public.wali_links;
create policy "wali_links_select_as_wali"
  on public.wali_links for select
  using (auth.uid() = wali_user_id);

-- Ward can update/revoke their own link; wali can update to accept
drop policy if exists "wali_links_update_ward_or_wali" on public.wali_links;
create policy "wali_links_update_ward_or_wali"
  on public.wali_links for update
  using (auth.uid() = ward_id or auth.uid() = wali_user_id)
  with check (auth.uid() = ward_id or auth.uid() = wali_user_id);
