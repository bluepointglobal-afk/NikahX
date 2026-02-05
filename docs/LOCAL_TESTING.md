# Local QA & Testing Guide

This guide explains how to run the QA suite locally for the NikahX backend.

## Prerequisites

1.  **Node.js**: Ensure Node.js (v18+) is installed.
2.  **Supabase CLI**: Required for running the local instance. `brew install supabase/tap/supabase` (on macOS).
3.  **Docker**: Required for Supabase CLI.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Supabase**:
    Start the local Supabase stack. This spins up the database, auth, storage, and edge functions.
    ```bash
    npx supabase start
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root if it doesn't exist. The tests look for `Supabase URL` and `Anon Key`.
    You can get these from the output of `npx supabase start`.
    
    Example `.env`:
    ```env
    SUPABASE_URL=http://127.0.0.1:54321
    SUPABASE_ANON_KEY=your-anon-key-from-CLI-output
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-CLI-output
    ```

## Running Tests

### 1. Seed Data
Populate the database with test users (`User A`, `User B`, `Guardian C`), a match, messages, and a report.
```bash
npm run seed
```
*Note: This script requires `SUPABASE_SERVICE_ROLE_KEY` to be set in `.env` to bypass RLS for creation.*

### 2. Run Integration Tests
Run the Vitest test suite.
```bash
npm test
```

## Test Files

-   **`tests/rls.test.ts`**: Verifies Row Level Security.
    -   Checks profile privacy.
    -   Verifies match visibility logic.
    -   Tests Family/Guardian access patterns.
-   **`tests/functions.test.ts`**: Verifies Edge Functions.
    -   Checks authentication on AI endpoints.
    -   Tests basic webhook signatures (mocked).

## Troubleshooting

-   **Connection Refused**: Ensure Supabase is running (`npx supabase status`).
-   **RLS Failures in Seed**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct. The seed script needs admin privileges.
