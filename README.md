# NikahX Backend

Strictly sharia-compliant, privacy-first matchmaking backend.

## Structure
- **Supabase**: Database, Auth, Storage, Edge Functions.
- **Missions**: 8 specialized agent missions (Architect, DB, RLS, Match, AI, Payments, Mod, QA).

## Setup
1. Install Supabase CLI.
2. `supabase start`
3. `supabase db reset` (Applies all migrations, including `0001_init.sql` and seeds).
4. `supabase functions serve` (Run edge functions locally).

## Missions
See `/docs` for details on implemented missions.
