# CI/CD & Testing

## Prerequisites
- Docker
- Supabase CLI
- Deno

## Local Testing
1. Start Supabase:
   ```bash
   supabase start
   ```
2. Reset DB (Applies schema & seed):
   ```bash
   supabase db reset
   ```
3. Run Tests:
   ```bash
   ./scripts/test_ci.sh
   ```

## Automated CI
Configure your CI provider (GitHub Actions) to:
1. Install Supabase CLI.
2. `supabase start`.
3. Run `deno test`.
