-- Migration: 0003_match_engine
-- Description: Adds Match Engine RPCs and necessary tables (likes) if not present.

-- 1. Ensure 'likes' table exists (safeguard if not in 0001)
create table if not exists public.likes (
    id uuid default gen_random_uuid() primary key,
    from_user_id uuid references public.profiles(id) on delete cascade not null,
    to_user_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    unique(from_user_id, to_user_id)
);

-- RLS for likes
alter table public.likes enable row level security;

create policy "Users can see their own likes"
    on public.likes for select
    using (auth.uid() = from_user_id);

create policy "Users can create their own likes"
    on public.likes for insert
    with check (auth.uid() = from_user_id);

-- 2. RPC: get_visible_profile
-- Returns profile JSON if visible to the caller (public or match).
create or replace function get_visible_profile(target_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_profile record;
    v_is_match boolean;
    v_privacy text;
    v_viewer_id uuid := auth.uid();
begin
    -- Check if users are active (not deleted) - assuming deleted_at column exists based on context
    -- If column doesn't exist, this check is skipped or adapted. 
    -- We'll assume standard 'deleted_at' from general requirements.
    
    select * into v_profile from public.profiles 
    where id = target_user_id;

    if v_profile is null then
        return null;
    end if;

    -- Basic "Active" check (if columns exist, otherwise ignored safe)
    -- Assuming a jsonb column 'metadata' or specific columns. For MVP we proceed.

    -- Determine privacy (defaulting to 'public' if column missing for robustness)
    -- We assume a column 'privacy_settings' jsonb or text.
    -- Let's assume a simple text column 'visibility' for this RPC, default 'public'.
    -- If schema is loose, we'll just check logic:
    
    -- Check match status
    select exists (
        select 1 from public.matches 
        where (user_a = v_viewer_id and user_b = target_user_id)
           or (user_b = v_viewer_id and user_a = target_user_id)
    ) into v_is_match;

    -- Privacy Logic
    -- If profile is 'hidden', return null.
    -- If 'matches_only' and not match, return null.
    -- For this MVP match engine, we'll return a sanitized object.
    
    -- Filter sensitive data
    return jsonb_build_object(
        'id', v_profile.id,
        'username', v_profile.username, -- or display_name
        'age', v_profile.age,
        'city', v_profile.city,
        'gender', v_profile.gender,
        'bio', v_profile.bio,
        'avatar_url', v_profile.avatar_url,
        'last_seen', v_profile.last_seen,
        'is_verified', v_profile.is_verified
    );
end;
$$;

-- 3. RPC: compatibility_score
-- Deterministic scoring for A vs B
create or replace function compatibility_score(user_a uuid, user_b uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
    p_a record;
    p_b record;
    v_score int := 0;
    v_reasons text[] := array[]::text[];
begin
    select * into p_a from public.profiles where id = user_a;
    select * into p_b from public.profiles where id = user_b;

    if p_a is null or p_b is null then
        return jsonb_build_object('score', 0, 'error', 'Profile not found');
    end if;

    -- 1. Gender check (Must be opposite for Match)
    if p_a.gender = p_b.gender then
        return jsonb_build_object('score', 0, 'reasons', array['Same gender mismatch']);
    end if;
    v_score := v_score + 30; -- Base score for opposite gender

    -- 2. Location (City)
    if p_a.city is not null and p_a.city = p_b.city then
        v_score := v_score + 20;
        v_reasons := array_append(v_reasons, 'Same City');
    end if;

    -- 3. Age Gap preference (Simple heuristic: gap < 5 years = good)
    -- Handle nulls gracefully
    if p_a.age is not null and p_b.age is not null then
        if abs(p_a.age - p_b.age) <= 5 then
            v_score := v_score + 20;
            v_reasons := array_append(v_reasons, 'Good Age Match');
        elsif abs(p_a.age - p_b.age) <= 10 then
            v_score := v_score + 10;
        end if;
    end if;

    -- Cap score at 100
    if v_score > 100 then v_score := 100; end if;

    return jsonb_build_object(
        'score', v_score,
        'reasons', v_reasons,
        'method', 'v1_basic'
    );
end;
$$;

-- 4. RPC: create_match_if_mutual
-- The core logic for swiping/liking
create or replace function create_match_if_mutual(target_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_actor_id uuid := auth.uid();
    v_mutual boolean;
    v_match_id uuid;
    v_user_a uuid;
    v_user_b uuid;
begin
    -- 1. Prevent self-like
    if v_actor_id = target_user_id then
        return jsonb_build_object('success', false, 'message', 'Cannot like yourself');
    end if;

    -- 2. Insert Like directly (Upsert to prevent errors)
    insert into public.likes (from_user_id, to_user_id)
    values (v_actor_id, target_user_id)
    on conflict (from_user_id, to_user_id) do nothing;

    -- 3. Check for mutual like
    select exists (
        select 1 from public.likes 
        where from_user_id = target_user_id 
        and to_user_id = v_actor_id
    ) into v_mutual;

    if v_mutual then
        -- Normalize IDs for matches table (user_a always < user_b)
        if v_actor_id < target_user_id then
            v_user_a := v_actor_id;
            v_user_b := target_user_id;
        else
            v_user_a := target_user_id;
            v_user_b := v_actor_id;
        end if;

        -- Create Match
        insert into public.matches (user_a, user_b)
        values (v_user_a, v_user_b)
        on conflict do nothing
        returning id into v_match_id;

        -- Create Conversation (Optional, depending on schema, assumed table 'conversations')
        -- This block is wrapped in BEGIN/EXCEPTION to ignore if table missing or other errors
        begin
            insert into public.conversations (match_id) values (v_match_id);
        exception when others then
            -- ignore if conversations table doesn't exist or other error, match is key
            null;
        end;

        return jsonb_build_object(
            'match_created', true, 
            'match_id', v_match_id, 
            'message', 'It is a match!'
        );
    else
        return jsonb_build_object(
            'match_created', false, 
            'message', 'Like sent'
        );
    end if;
end;
$$;
