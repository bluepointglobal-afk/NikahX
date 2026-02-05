# Backend Overview & Architecture

## Architecture Pattern
**BaaS Provider**: Supabase (PostgreSQL 15+, GoTrue Auth, Realtime, Storage).

### Core Components
1.  **Database (PostgreSQL)**:
    -   **`public` schema**: Stores users, profiles, matches, family connections.
    -   **`private` / `vault` schema**: Stores sensitive verification metadata before scrubbing.
    -   **Extensions**: `pg_cron` (for 90-day policies), `postgis` (for location matching if needed).

2.  **Auth (GoTrue)**:
    -   Phone/SMS or Email/Password login.
    -   **Custom Claims**: `is_verified`, `age_verified`.

3.  **Edge Functions (Deno/TypeScript)**:
    -   `verify-identity`: Handles ID upload processing and scrubbing.
    -   `cron-cleanup`: Runs deletion policies.
    -   `invite-guardian`: Handles family panel invitations.

4.  **Storage**:
    -   `verification-docs`: Private bucket, short TTL, strict RLS (insert only for user, read only for service role).
    -   `profiles`: Public/Authenticated read for profile photos.

## Data Flow

### 1. Onboarding & Verification
1.  User signs up -> `auth.users` entry created.
2.  Trigger creates `public.profiles` entry. Status: `unverified`.
3.  User enters DOB.
    -   *Constraint*: Must be 18+. DB Check constraint `check (age >= 18)`.
4.  User uploads ID to `verification-docs` bucket.
5.  Edge Function `verify-identity` triggered:
    -   Validates ID (OCR/AI service).
    -    Updates `public.profiles.is_verified = true`.
    -   **Scrubbing**: Deletes raw ID file from Storage immediately (or schedules 24h deletion).
    -   Logs "verification event" (timestamp, method) but NOT the ID data itself.

### 2. Family Panel Access
1.  User (Ward) invites Guardian (email/phone).
2.  Guardian creates account.
3.  connection stored in `family_connections` table.
4.  **Access Control**:
    -   Guardian views Ward's matches matches via RLS: `auth.uid() IN (select guardian_id from family_connections where ward_id = distinct_id)`.
    -   Guardian can "flag" or "comment" on matches (internal family notes).

### 3. Data Retention (90-Day Policy)
-   **Inactive Accounts**: If `last_seen < now() - 90 days`, mark for archival/deletion.
-   **Verification Data**: Hard limit. Any raw verification artifacts must be purged.
-   **Chat History**: Optional policy to retain or clear chats older than 90 days.

## RLS Strategy (Row Level Security)

-   **deny-by-default**: All tables have RLS enabled.
-   **Profiles**:
    -   `SELECT`: Public portion visible to authenticated users (if matching criteria met).
    -   `UPDATE`: `auth.uid() = id`.
-   **Family Connections**:
    -   Ward can `INSERT` invitations.
    -   Guardian can `SELECT` rows where they are the guardian.
-   **Matches/Chats**:
    -   Participants can view.
    -   **Family Access**: Guardian can `SELECT` matches where `ward_id` is their linked Ward. (Read-Only access to Ward's activity).

## Endpoints (Supabase Edge Functions)

| Function | Method | Application Information |
| :--- | :--- | :--- |
| `/verify-identity` | POST | Takes file path/blob. Performs verification. Scrubs data. Returns status. |
| `/invite-guardian` | POST | Sends invite code/link to potential guardian. |
| `/guardian-action` | POST | Guardian approves/rejects specific match (if workflow requires). |
| `/cron-cleanup` | POST | (Scheduled) Enforces 90-day scrubbing policies. |
