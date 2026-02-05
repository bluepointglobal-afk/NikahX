# Deployment (Supabase + Vercel)

## 1) Supabase: database migrations

### Local development
Prereqs:
- Docker Desktop running
- Supabase CLI installed (`supabase --version`)

From repo root:
```bash
supabase start
# apply migrations + seed (destructive for local DB)
supabase db reset
```

Migrations live in `supabase/migrations/`.

If `supabase start` fails with Docker errors:
- Ensure Docker Desktop Engine is fully started.
- On macOS, Docker may expose the daemon on `~/.docker/run/docker.sock`.

### Remote (cloud) project
Link the repo to your Supabase project and push changes:
```bash
supabase login
supabase link --project-ref <your-project-ref>
# push migrations to the linked project
supabase db push
```

## 2) Supabase: Edge Functions (Stripe)

Functions in this repo:
- `supabase/functions/stripe_checkout`
- `supabase/functions/stripe_webhook`
- `supabase/functions/stripe_portal`

Deploy (after linking):
```bash
supabase functions deploy stripe_checkout
supabase functions deploy stripe_webhook
supabase functions deploy stripe_portal
```

### Required secrets for Edge Functions
Set these in Supabase (project settings → Edge Functions → Secrets) or via CLI:
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_or_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Notes:
- `stripe_checkout` and `stripe_portal` also rely on Supabase-provided env vars:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- `stripe_webhook` and `stripe_portal` use admin capabilities and require:
  - `SUPABASE_SERVICE_ROLE_KEY`

These Supabase variables are available in the Edge Functions runtime for the linked project.

## 3) Frontend (Vite) environment variables

For local dev, create `frontend-test/.env.local` (see `frontend-test/.env.example`).

Required:
- `VITE_SUPABASE_URL` (Supabase project URL)
- `VITE_SUPABASE_ANON_KEY` (public anon key)
- `VITE_STRIPE_PRICE_ID` (Stripe Price ID used by `stripe_checkout`)

## 4) Vercel preview deployment (frontend-test)

Recommended Vercel settings:
- **Root Directory:** `frontend-test`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Environment variables (Vercel → Project Settings → Environment Variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PRICE_ID`

After deploy, confirm Premium flow:
- Visit `/premium`
- Clicking “Upgrade to Premium” should invoke the deployed function `stripe_checkout`

### Stripe webhook
Point your Stripe webhook endpoint to:
- `https://<project-ref>.functions.supabase.co/stripe_webhook`

And set the webhook signing secret (`whsec_...`) as `STRIPE_WEBHOOK_SECRET` in Supabase secrets.
