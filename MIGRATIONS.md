# NikahX — Supabase Migrations

This repo contains **two historical migration tracks**:

- An older `000x_*.sql` series (early draft schema: `app_user`, `photo`, `match`, `message`, `entitlement`, etc.)
- A newer **timestamped** series (canonical schema: `profiles`, `swipes`, `matches`, `messages`, etc.)

The project has been standardized on the **timestamped migrations**.

## Canonical migration chain (fresh project)

Supabase applies migrations in filename-sorted order. The intended order is:

1. `supabase/migrations/20240101000000_init.sql`
   - Creates core schema: `profiles`, `swipes`, `matches`, `messages`, `family_observers`
   - Creates helper trigger function `update_updated_at_column()` and profile update trigger

2. `supabase/migrations/20240101000001_rls.sql`
   - Enables RLS on core tables
   - Adds base policies for profiles, swipes, matches, messages, and family observer reads

3. `supabase/migrations/20240101000002_match_logic.sql`
   - Adds matching RPCs/functions (compatibility scoring + interaction logic)

4. `supabase/migrations/20260102000005_moderation.sql`
   - Canonical moderation model (enums + `reports` + `moderation_logs`)
   - Adds `profiles.moderation_status` and message safety trigger

5. `supabase/migrations/20260205000000_phase2_onboarding_matching.sql`
   - Phase 2 onboarding fields on `profiles`
   - Adds `preferences`, `wali_links`, match status workflow + additional RPCs

6. `supabase/migrations/20260205000001_stripe_subscription.sql`
   - Adds Stripe subscription tracking columns to `profiles`

7. `supabase/migrations/20260205000002_rls_match_status.sql`
   - Tightens messaging policy to require `matches.status = 'active'`

## Archived migrations

Conflicting / superseded migrations were moved to `supabase/migrations/_archive/` so they **won’t run** on `supabase db reset`, but are still kept for reference.

- `_archive/0001_init.sql`, `_archive/0002_rls.sql`, `_archive/0003_match_engine.sql`
  - Older draft schema (different table names and constraints) and contains inconsistencies (e.g. plural vs singular table names).

- `_archive/20240101000003_moderation.sql`
  - Older moderation schema for `reports` that conflicts with the newer `20260102000005_moderation.sql` (same table name, different columns).

- `_archive/20260102000006_payments.sql`
  - Alters an `entitlement` table that does not exist in the canonical timestamped schema.
  - Stripe subscription state is tracked on `profiles` (see `20260205000001_stripe_subscription.sql` and `supabase/functions/stripe_webhook`).

## Running locally

From repo root:

```bash
supabase db reset
```

If you get CLI errors, confirm Supabase CLI is installed:

```bash
supabase --version
```

Then ensure Docker is running (Supabase local uses Docker).
