# Quick Deployment Guide - Vercel

## 🚀 Deploy NikahX to Production (5 Minutes)

### Option 1: Vercel CLI (Fastest)

```bash
# 1. Authenticate (one-time)
cd /Users/architect/.openclaw/workspace/03_REPOS/nikahx/frontend-test
vercel login
# Opens browser → Sign in with GitHub/Google/Email

# 2. Deploy to production
vercel --prod

# 3. Follow prompts:
# - Set up and deploy? [Y]
# - Which scope? [Your account]
# - Link to existing project? [N]
# - Project name? [nikahx-frontend or custom]
# - Directory? [./]
# - Override settings? [N]

# 4. Copy the production URL (e.g., https://nikahx-abc123.vercel.app)
```

### Option 2: Vercel Dashboard (Recommended for Teams)

1. **Push to GitHub (if not already):**
   ```bash
   cd /Users/architect/.openclaw/workspace/03_REPOS/nikahx
   git add .
   git commit -m "Phase 2: Ready for production deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Visit https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repo
   - Root directory: `frontend-test`
   - Framework: Vite
   - Click "Deploy"

3. **Set Environment Variables:**
   Go to Project → Settings → Environment Variables:
   
   ```
   VITE_SUPABASE_URL = https://vgrwttaitvrqfvnepyum.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncnd0dGFpdHZycWZ2bmVweXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc5NTYsImV4cCI6MjA4NTg2Mzk1Nn0.GEYX-sU_hzzJHgwMNmY4RHc-YJqrCYXXXilA1BRFZNg
   VITE_STRIPE_PUBLISHABLE_KEY = pk_test_YOUR_REAL_KEY
   VITE_STRIPE_PRICE_ID = price_YOUR_REAL_PRICE_ID
   ```

4. **Redeploy:**
   - Trigger redeploy after adding env vars
   - Or push a new commit to trigger automatic deploy

---

## 🔧 Deploy Supabase Edge Functions

```bash
cd /Users/architect/.openclaw/workspace/03_REPOS/nikahx

# 1. Link to production Supabase
supabase link --project-ref vgrwttaitvrqfvnepyum

# 2. Deploy edge functions
supabase functions deploy stripe_checkout --no-verify-jwt
supabase functions deploy stripe_webhook --no-verify-jwt
supabase functions deploy stripe_portal --no-verify-jwt

# 3. Set production secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
supabase secrets set STRIPE_PRICE_ID=price_YOUR_PRICE_ID
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncnd0dGFpdHZycWZ2bmVweXVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4Nzk1NiwiZXhwIjoyMDg1ODYzOTU2fQ.hdiFMzpAleXZsksROxsCm0p7l4iqoFrTmF4lDInBMzo
```

---

## 💳 Configure Stripe Webhook

1. **Get your edge function URL:**
   ```
   https://vgrwttaitvrqfvnepyum.functions.supabase.co/stripe_webhook
   ```

2. **Add webhook in Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - Endpoint URL: (paste URL from step 1)
   - Events to send:
     * `checkout.session.completed`
     * `customer.subscription.created`
     * `customer.subscription.updated`
     * `customer.subscription.deleted`
     * `invoice.payment_succeeded`
     * `invoice.payment_failed`
   - Click "Add endpoint"

3. **Update webhook secret:**
   - Click on the webhook you just created
   - Click "Reveal" under "Signing secret"
   - Copy the `whsec_...` key
   - Run:
     ```bash
     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
     ```

---

## ✅ Verify Deployment

### 1. Test Frontend
- Visit your Vercel URL
- Sign up with a new account
- Complete onboarding flow
- Browse discovery page
- Click "Upgrade to Premium"

### 2. Test Stripe Integration
- Click checkout button
- You should be redirected to Stripe checkout page
- Use test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- Complete payment
- Verify redirect to success page

### 3. Verify Webhook
- Check Stripe Dashboard → Webhooks → Your webhook
- Recent deliveries should show events
- All should be "Succeeded" (200 status)

### 4. Check Database
- Open Supabase Studio: https://supabase.com/dashboard/project/vgrwttaitvrqfvnepyum
- Go to Table Editor → `subscriptions`
- Your user should have `status = 'active'`

---

## 🐛 Troubleshooting

### Vercel Deploy Fails
- Check build logs in Vercel dashboard
- Verify all env vars are set
- Ensure root directory is `frontend-test`

### Edge Function Errors
- Run `supabase functions logs stripe_checkout` to see errors
- Verify secrets are set: `supabase secrets list`
- Check CORS settings in edge function code

### Stripe Webhook Not Firing
- Test webhook in Stripe Dashboard → "Send test webhook"
- Check edge function logs for errors
- Verify webhook signing secret matches

### Subscription Not Updating
- Check `supabase functions logs stripe_webhook`
- Verify webhook events include `checkout.session.completed`
- Check RLS policies on `subscriptions` table

---

## 📱 Share Your Preview

Once deployed, share your production URL:

```
🎉 NikahX Phase 2 is live!

👉 https://your-app.vercel.app

Features:
✅ User authentication
✅ Multi-step onboarding
✅ Wali/guardian system
✅ Discovery feed
✅ Stripe payments
✅ Subscription management

Test credentials: Create your own account!
```

---

## 🔄 Continuous Deployment

**Automatic deploys on every push:**
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Preview deployment
- Vercel sends deployment notifications via email/Slack

**Environment-specific configs:**
- Production: Uses `.env.production`
- Preview: Can use separate preview env vars
- Local: Uses `.env.local`

---

## 🎯 Next Steps After Deployment

1. **Custom Domain:**
   - Vercel Dashboard → Settings → Domains
   - Add your domain (e.g., `nikahx.com`)
   - Update DNS records as instructed

2. **Analytics:**
   - Vercel Analytics (built-in)
   - Google Analytics (add to `index.html`)
   - PostHog, Mixpanel, etc.

3. **Monitoring:**
   - Sentry for error tracking
   - Supabase Dashboard for database metrics
   - Vercel logs for function errors

4. **Production Checklist:**
   - [ ] Switch to live Stripe keys (`sk_live_...`)
   - [ ] Enable rate limiting on edge functions
   - [ ] Set up database backups (Supabase Dashboard)
   - [ ] Configure CORS for production domain
   - [ ] Add CSP headers for security
   - [ ] Set up email templates (transactional emails)

---

**Estimated Total Time:** 15-20 minutes  
**Current Status:** Build ready, waiting for `vercel login`  
**Support:** Check logs in Vercel/Supabase dashboards for any issues
