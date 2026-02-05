-- Enable necessary extensions
create extension if not exists "pg_trgm";
create extension if not exists "postgis";

-- 1. App User
create table app_user (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  phone text unique,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  marketing_opt_in boolean default false,
  is_banned boolean default false,
  banned_at timestamptz,
  ban_reason text,
  deletion_requested_at timestamptz, -- For 90-day purge workflow
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Profile
create table profile (
  id uuid primary key references app_user(id) on delete cascade,
  display_name text,
  bio text,
  gender text check (gender in ('male', 'female')),
  date_of_birth date,
  location_enabled boolean default false,
  location geography(POINT), -- PostGIS point
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Profile Privacy
create table profile_privacy (
  user_id uuid primary key references app_user(id) on delete cascade,
  is_profile_visible boolean default true,
  blur_photos boolean default false,
  show_age boolean default true,
  updated_at timestamptz default now()
);

-- 4. Photo
create table photo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete cascade not null,
  storage_path text not null,
  is_verification_photo boolean default false,
  is_primary boolean default false,
  sort_order int default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- 5. Preference (Discovery Settings)
create table preference (
  user_id uuid primary key references app_user(id) on delete cascade,
  min_age int default 18,
  max_age int default 100,
  max_distance_km int default 100,
  looking_for_gender text check (looking_for_gender in ('male', 'female', 'detect')), -- 'detect' could mean opposite of self
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Like & Match
create table "like" (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references app_user(id) on delete cascade not null,
  receiver_id uuid references app_user(id) on delete cascade not null,
  is_super_like boolean default false,
  created_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

create table match (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references app_user(id) on delete cascade not null,
  user_b_id uuid references app_user(id) on delete cascade not null,
  unmatched_at timestamptz,
  unmatch_reason text,
  created_at timestamptz default now(),
  unique(user_a_id, user_b_id)
);

-- 7. Conversation & Message
create table conversation (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references match(id) on delete cascade not null,
  last_message_at timestamptz,
  created_at timestamptz default now()
);

create table message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversation(id) on delete cascade not null,
  sender_id uuid references app_user(id) on delete cascade not null,
  content text,
  content_type text default 'text' check (content_type in ('text', 'image', 'voice')),
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 8. Wali (Guardian) link & Access
create table wali_link (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid references app_user(id) on delete cascade not null,
  wali_email text not null,
  status text default 'pending' check (status in ('pending', 'active', 'rejected', 'revoked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table wali_access (
  id uuid primary key default gen_random_uuid(),
  wali_link_id uuid references wali_link(id) on delete cascade not null,
  conversation_id uuid references conversation(id) on delete cascade not null,
  granted_at timestamptz default now(),
  revoked_at timestamptz
);

-- 9. Verification
create table verification (
  user_id uuid primary key references app_user(id) on delete cascade,
  method text not null, -- e.g., 'gov_id', 'selfie', 'phone'
  status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  scrubbed_at timestamptz, -- For privacy compliance after verification
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. Report & Moderation
create table report (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references app_user(id) on delete set null,
  target_id uuid references app_user(id) on delete cascade not null,
  category text not null,
  description text,
  status text default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table moderation_action (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid, -- Identify which admin took action (if you have an admin table or logic)
  target_user_id uuid references app_user(id) on delete cascade not null,
  action_type text not null, -- 'ban', 'warning', 'suspend'
  reason text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- 11. Entitlement
create table entitlement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete cascade not null,
  feature_key text not null, -- 'super_like', 'travel_mode', 'see_who_liked_me'
  amount int default 0, -- consumption based
  is_active boolean default true, -- subscription based
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 12. AI Request Log
create table ai_request (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete set null,
  feature text not null, -- 'profile_writer', 'icebreaker', 'safety_scan'
  tokens_used int,
  model_version text,
  created_at timestamptz default now()
);

-- 13. Audit Log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- 14. Fraud Retention (Banned User Data)
create table fraud_retention (
  id uuid primary key default gen_random_uuid(),
  original_user_id uuid, -- Not a FK, referencing deleted user
  email text,
  phone text,
  device_id text,
  ban_reason text,
  banned_at timestamptz,
  retained_until timestamptz,
  created_at timestamptz default now()
);


-- Indexes
create index idx_app_user_email on app_user(email);
create index idx_app_user_phone on app_user(phone);

create index idx_profile_location on profile using gist(location);
create index idx_preference_user on preference(user_id);

create index idx_like_sender on "like"(sender_id);
create index idx_like_receiver on "like"(receiver_id);

create index idx_match_users on match(user_a_id, user_b_id);

create index idx_message_conversation on message(conversation_id);
create index idx_message_sender on message(sender_id);

-- Updated_at Trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_app_user_modtime before update on app_user for each row execute function update_updated_at_column();
create trigger update_profile_modtime before update on profile for each row execute function update_updated_at_column();
create trigger update_preference_modtime before update on preference for each row execute function update_updated_at_column();
create trigger update_wali_link_modtime before update on wali_link for each row execute function update_updated_at_column();
create trigger update_verification_modtime before update on verification for each row execute function update_updated_at_column();
create trigger update_report_modtime before update on report for each row execute function update_updated_at_column();
create trigger update_entitlement_modtime before update on entitlement for each row execute function update_updated_at_column();

-- Safety / Prevention trigger (Example: Cannot like if banned)
create or replace function check_user_active()
returns trigger as $$
begin
  if exists (select 1 from app_user where id = new.sender_id and is_banned = true) then
    raise exception 'User is banned and cannot perform this action';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_like_active before insert on "like" for each row execute function check_user_active();
