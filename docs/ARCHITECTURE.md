# NikahX Backend Architecture

## Overview
NikahX is a privacy-first, Sharia-compliant matchmaking platform. The backend is built on Supabase, leveraging Postgres as the source of truth, Edge Functions for business logic, and RLS for security.

## Tech Stack
- **Database**: Postgres 15+ (Hosted on Supabase)
- **Security**: Row Level Security (RLS) is ENABLED on ALL tables.
- **API**: Supabase Auto-generated API (gated by RLS) + Edge Functions (Deno/TypeScript) for privileged actions.
- **Storage**: Supabase Storage for media (profile photos, verification documents).
- **Auth**: Supabase Auth (Phone OTP / Email).

## Data Flow
1. **Client** (App) authenticates via Supabase Auth.
2. **Client** reads public data (e.g., loaded profiles) directly via Supabase Client (RLS enforces visibility).
3. **Client** writes data (e.g., update profile) directly via Supabase Client (RLS enforces ownership).
4. **Client** triggers complex actions (e.g., "Request Match", "Get AI Advice", "Pay") via **Edge Functions** (RPC or HTTP).
    - *Constraint*: AI LLM keys never exposed to client. AI logic resides strictly in Edge Functions.

## Core Constraints
1. **18+ Enforcement**: `dob` checks in RLS and Functions.
2. **Anti-Scam**: No money requests allowed in chat (regex/AI detection in moderation mission).
3. **Gender Separation**: Strict visibility rules (Men see Women, Women see Men).
4. **Wali/Family**: Optional access for family members (observer pattern).
5. **Data Scrubbing**: Verification documents (ID/Passport) deleted 90 days after verification (Cron job).

## Directory Structure
- `/supabase/migrations`: SQL Schema & RLS policies.
- `/supabase/functions`: TypeScript Edge Functions.
- `/supabase/seed.sql`: Local dev data.
- `/docs`: Architecture and mission documentation.
