-- Phase 2 MVP: Stripe subscription state tracking

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_until timestamptz;

create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription on public.profiles(stripe_subscription_id);
