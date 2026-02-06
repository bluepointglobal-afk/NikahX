# NikahX Phase 2 Deployment Status

## ✅ Completed Tasks

### 1. Docker & Supabase Setup
- ✅ Docker confirmed running
- ✅ Supabase local instance started successfully
- ✅ All Phase 2 migrations applied successfully:
  - `20260205000000_phase2_onboarding_matching.sql` - Onboarding fields, preferences, wali system
  - `20260205000001_stripe_subscription.sql` - Stripe subscription schema
  - `20260205000002_rls_match_status.sql` - RLS policies for match status

### 2. Environment Configuration
- ✅ Created `/supabase/.env` with Supabase keys
- ✅ Updated `/frontend-test/.env` with local Supabase URL and ANON_KEY
- ✅ Frontend builds successfully
- ✅ Development server tested and working

### 3. Supabase Connection Details
**Local Development URLs:**
- Studio: http://127.0.0.1:54323
- API: http://127.0.0.1:54321
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

**Keys (Local Dev):**
- ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
- SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

### 4. Edge Functions Ready
Three Stripe edge functions are available and ready to deploy:
- `/supabase/functions/stripe_checkout` - Creates Stripe checkout sessions
- `/supabase/functions/stripe_portal` - Manages billing portal
- `/supabase/functions/stripe_webhook` - Handles Stripe webhooks

---

## 🚨 BLOCKERS - Required to Proceed

### Missing Stripe API Keys
The following Stripe keys are required to complete the deployment:

1. **STRIPE_SECRET_KEY** - Your Stripe secret key (starts with `sk_test_...` for test mode)
2. **STRIPE_WEBHOOK_SECRET** - Webhook signing secret (starts with `whsec_...`)
3. **VITE_STRIPE_PRICE_ID** - The Price ID for your subscription product (starts with `price_...`)
4. **STRIPE_PUBLISHABLE_KEY** - Frontend publishable key (starts with `pk_test_...` for test mode)

**Where to find these:**
- Log into https://dashboard.stripe.com/test/apikeys
- Secret keys are under "API keys"
- Create a Product/Price at https://dashboard.stripe.com/test/products
- Webhook secret comes from webhook creation at https://dashboard.stripe.com/test/webhooks

**Files to update with keys:**
```bash
# Backend edge functions
/supabase/.env
  - STRIPE_SECRET_KEY=sk_test_YOUR_KEY
  - STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
  - STRIPE_PRICE_ID=price_YOUR_PRICE_ID

# Frontend
/frontend-test/.env
  - VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
  - VITE_STRIPE_PRICE_ID=price_YOUR_PRICE_ID
```

---

## 📋 Next Steps (Once Stripe Keys Are Provided)

### 1. Deploy Edge Functions Locally
```bash
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX
supabase functions serve
```

### 2. Test Locally
```bash
# In one terminal: Supabase (already running)
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX
supabase start

# In another terminal: Frontend
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX/frontend-test
npm run dev
# Visit http://localhost:5173
```

### 3. Deploy to Vercel
```bash
# Option A: Via Vercel CLI
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX/frontend-test
npm install -g vercel
vercel --prod

# Option B: Via GitHub (recommended)
# 1. Push to GitHub
# 2. Connect repo at vercel.com
# 3. Set environment variables in Vercel dashboard
# 4. Deploy automatically on push
```

**Required Vercel Environment Variables:**
```
VITE_SUPABASE_URL=<your-production-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-production-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ID=price_...
```

### 4. Deploy to Production Supabase
```bash
# Link to your production project
supabase link --project-ref <your-project-ref>

# Push database migrations
supabase db push

# Deploy edge functions
supabase functions deploy stripe_checkout --no-verify-jwt
supabase functions deploy stripe_webhook --no-verify-jwt
supabase functions deploy stripe_portal --no-verify-jwt

# Set production secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-prod-service-key>
```

### 5. Configure Stripe Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://<your-project-ref>.functions.supabase.co/stripe_webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 🎯 Deliverable Status

### What's Working Now
- ✅ Local Supabase instance with all Phase 2 schemas
- ✅ Frontend compiles and runs locally
- ✅ Database migrations for:
  - User onboarding (education, occupation, religiosity, etc.)
  - Preferences matching
  - Wali/guardian system
  - Stripe subscription tracking
  - Match status workflow (pending_wali → active)
- ✅ Edge functions prepared for Stripe integration

### What's Blocked
- ❌ Edge function deployment (needs Stripe keys)
- ❌ Full payment flow testing (needs Stripe keys)
- ❌ Production deployment (needs Stripe keys + production Supabase)

### Full Flow Preview (Once Unblocked)
1. User signs up → Profile created
2. User completes onboarding (demographics, preferences)
3. User assigns wali/guardian
4. User upgrades via Stripe checkout → edge function creates session
5. Payment succeeds → webhook updates subscription status
6. User can browse discovery feed (privacy-first, wali-approved matches)
7. Mutual likes create pending matches
8. Wali approves/rejects matches
9. Both walis approve → match becomes active
10. Users can message after mutual consent

---

## 🛠️ Testing Commands

```bash
# Check Supabase status
supabase status

# View Supabase logs
supabase logs

# Test edge functions locally (after adding keys)
curl http://localhost:54321/functions/v1/stripe_checkout \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_..."}'

# Rebuild frontend
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX/frontend-test
npm run build

# Run frontend locally
npm run dev
```

---

## 📝 Summary

**Ready:** Database, migrations, frontend build system, local dev environment  
**Blocked:** Stripe integration requires API keys  
**Next:** Provide Stripe test keys to complete local testing, then deploy to production

**Estimated Time to Full Deployment (with keys):** ~30 minutes
- 5 min: Add keys and test locally
- 10 min: Deploy edge functions to production Supabase
- 10 min: Deploy frontend to Vercel
- 5 min: Configure Stripe webhooks and test end-to-end

---

**Generated:** 2025-02-05  
**Project:** NikahX Phase 2 MVP  
**Task:** Onboarding → Discovery → Stripe Payment Flow
