-- Add Stripe columns to entitlement table
alter table entitlement
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists tier text check (tier in ('free', 'premium'));

-- Create index for lookups
create index if not exists idx_entitlement_stripe_sub on entitlement(stripe_subscription_id);
create index if not exists idx_entitlement_stripe_cust on entitlement(stripe_customer_id);

-- Ensure we can store the 'premium' state
-- We will use feature_key = 'subscription' or 'premium' to track the main tier.
