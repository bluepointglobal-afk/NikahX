# Stripe Payment Staging Deployment Guide

## Overview

This guide covers deploying the Stripe payment integration to staging environment, including:
- Frontend deployment to Vercel
- Supabase edge functions deployment
- Stripe webhook configuration
- End-to-end testing in staging

## Prerequisites

1. **Accounts & Access**:
   - [ ] Vercel account with NikahX project
   - [ ] Supabase project access
   - [ ] Stripe account with test keys
   - [ ] GitHub access to push code

2. **Local Testing Complete**:
   - [ ] All local Stripe tests passed
   - [ ] Payment flow works with test card
   - [ ] Database updates correctly after payment
   - [ ] Code committed to git

## Step 1: Prepare Environment

### 1.1 Verify Code Committed
```bash
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX
git status  # Should show "nothing to commit"
git log --oneline | head -5  # Should show recent commits
```

### 1.2 Update Frontend Build Config
```bash
cd frontend-test

# Ensure package.json has Stripe dependencies
grep -A2 "stripe" package.json

# Verify build works
npm install --legacy-peer-deps
npm run build

# Should complete without errors
```

### 1.3 Prepare Deployment Files
Ensure these files exist in root:
- [ ] `vercel.json` - Build and deployment configuration
- [ ] `.env.production` - Production environment variables
- [ ] `STRIPE_INTEGRATION.md` - Implementation documentation
- [ ] `STRIPE_TESTING_GUIDE.md` - Testing guide

## Step 2: Deploy to Vercel

### 2.1 Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project root
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX

# Deploy to staging
vercel --prod

# Or specify preview environment
vercel deploy
```

### 2.2 Using GitHub Integration

If Vercel is connected to GitHub:
1. Push code to a `staging` branch:
   ```bash
   git checkout -b staging
   git push origin staging
   ```
2. Vercel will automatically deploy preview
3. Once verified, merge to main branch
4. Vercel deploys main to production URL

### 2.3 Verify Deployment

1. Check deployment URL from Vercel dashboard
2. Navigate to https://your-staging-url.vercel.app/auth
3. Should load without errors
4. Check browser console for any errors

## Step 3: Configure Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables:

**Add these for Staging**:
```
VITE_SUPABASE_URL=https://vgrwttaitvrqfvnepyum.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncnd0dGFpdHZycWZ2bmVweXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc5NTYsImV4cCI6MjA4NTg2Mzk1Nn0.GEYX-sU_hzzJHgwMNmY4RHc-YJqrCYXXXilA1BRFZNg
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

**Trigger Redeploy**:
- In Vercel Dashboard, click "Redeploy" to rebuild with new env vars

## Step 4: Deploy Edge Functions to Supabase

### 4.1 Install Supabase CLI
```bash
npm install -g supabase

# Or if using Homebrew
brew install supabase/tap/supabase
```

### 4.2 Link to Supabase Project
```bash
cd /Users/architect/.openclaw/workspace/03_REPOS/NikahX

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref vgrwttaitvrqfvnepyum
```

### 4.3 Deploy Edge Functions
```bash
# Deploy all Stripe functions
supabase functions deploy stripe_checkout
supabase functions deploy stripe_portal
supabase functions deploy stripe_webhook

# Verify deployment
supabase functions list

# Check function logs
supabase functions logs stripe_checkout --limit 100
```

### 4.4 Verify Functions
Test the functions are working:
```bash
# Test stripe_checkout function
curl -X POST https://vgrwttaitvrqfvnepyum.supabase.co/functions/v1/stripe_checkout \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_1SxZKe4b4Crudawq7lU09S7B", "redirect_url": "https://your-staging-url.vercel.app/subscription/success"}'
```

## Step 5: Configure Stripe Webhooks

### 5.1 Add Staging Webhook Endpoint

In Stripe Dashboard → Developers → Webhooks:

1. Click "Add endpoint"
2. Enter endpoint URL:
   ```
   https://vgrwttaitvrqfvnepyum.supabase.co/functions/v1/stripe_webhook
   ```
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Click "Add endpoint"
5. Copy the webhook signing secret
6. Update in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx...
   ```

### 5.2 Verify Webhook Secret

```bash
# Check secret is set
supabase secrets list | grep STRIPE_WEBHOOK_SECRET

# If not set, add it
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Redeploy webhook function
supabase functions deploy stripe_webhook
```

## Step 6: Create Stripe Product (If Needed)

In Stripe Dashboard:

1. **Create Product**:
   - Go to Products → Create product
   - Name: "NikahX Premium"
   - Description: "Enhanced matching and features"
   - Pricing model: Recurring

2. **Add Price**:
   - Billing period: Monthly or Annual
   - Amount: Your desired price (e.g., $9.99/month)
   - Currency: USD
   - Get the Price ID (e.g., `price_1SxZKe4b4Crudawq7lU09S7B`)

3. **Update Configuration**:
   ```bash
   # Update Supabase secrets
   supabase secrets set VITE_STRIPE_PRICE_ID=price_your_price_id
   ```

## Step 7: End-to-End Testing in Staging

### 7.1 Create Test Account

1. Navigate to https://your-staging-url.vercel.app/auth
2. Create account with email: `staging-test@example.com`
3. Verify email in Supabase dashboard
4. Complete onboarding

### 7.2 Test Complete Payment Flow

1. Navigate to Premium page (/premium)
2. Click "Upgrade to Premium"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

### 7.3 Verify All Integrations

**Browser**:
- [ ] Success page loads correctly
- [ ] Shows "You're Premium" message
- [ ] Displays premium_until date
- [ ] Navigation works (links back to home)

**Supabase Database**:
```sql
SELECT id, email, is_premium, premium_until, stripe_customer_id
FROM profiles WHERE email = 'staging-test@example.com';
```

**Stripe Dashboard**:
- [ ] Check Customers list for test email
- [ ] Verify subscription is "active"
- [ ] Check invoice was created
- [ ] View test payment in Transactions

**Supabase Functions**:
```bash
supabase functions logs stripe_webhook --limit 50
# Should see: "Received checkout.session.completed event"
# Should see: "Updated profile with is_premium=true"
```

### 7.4 Test Additional Scenarios

**Declined Payment**:
1. Try payment with card: `4000 0000 0000 0002`
2. Should decline with error message
3. Should redirect to success page showing "canceled"
4. is_premium should remain false

**Subscription Management**:
1. After successful payment, go to `/account/subscription`
2. Click "Manage billing in Stripe"
3. Should open Stripe customer portal
4. Can cancel subscription from there

**Webhook Processing**:
1. In Stripe Dashboard, cancel the test subscription
2. Check function logs: `supabase functions logs stripe_webhook`
3. Check database: is_premium should become false
4. Reload subscription page - should show "Free"

## Step 8: Monitor and Debug

### Check Deployment Status
```bash
# Vercel deployment status
vercel list

# Supabase function status
supabase functions list

# Check function logs
supabase functions logs stripe_webhook --limit 100
```

### Common Issues

**Issue**: Webhook not processing
```bash
# Check logs
supabase functions logs stripe_webhook --limit 100

# Verify webhook secret
supabase secrets list | grep STRIPE_WEBHOOK_SECRET

# Test webhook delivery in Stripe Dashboard
# Developers → Webhooks → Your endpoint → Events → Resend event
```

**Issue**: Premium status not updating
```sql
-- Check last update time
SELECT id, is_premium, updated_at 
FROM profiles 
WHERE email = 'staging-test@example.com';

-- Check stripe customer ID
SELECT id, stripe_customer_id, stripe_subscription_id 
FROM profiles 
WHERE email = 'staging-test@example.com';
```

**Issue**: Edge function failing
```bash
# View detailed logs
supabase functions logs stripe_checkout --limit 100 --tail

# Redeploy function
supabase functions deploy stripe_checkout
```

## Step 9: Performance & Security Check

### Performance
- [ ] Premium page loads in < 2 seconds
- [ ] Checkout initiates in < 1 second
- [ ] Success page shows status in < 3 seconds
- [ ] Database query for premium status is fast

### Security
- [ ] STRIPE_WEBHOOK_SECRET is not exposed
- [ ] STRIPE_SECRET_KEY is not in browser
- [ ] All env vars are marked as "Sensitive" in Vercel
- [ ] Edge functions validate Authorization header
- [ ] Database RLS policies prevent unauthorized access

## Step 10: Documentation & Handoff

1. **Update Docs**:
   - [ ] README.md includes Stripe setup
   - [ ] STRIPE_INTEGRATION.md is complete
   - [ ] STRIPE_TESTING_GUIDE.md has staging section

2. **Create Runbook**:
   - [ ] How to test payment flow
   - [ ] How to handle payment failures
   - [ ] How to refund in Stripe
   - [ ] How to check logs

3. **Team Communication**:
   - [ ] Share staging URL
   - [ ] Provide test card details
   - [ ] Document any special setup steps
   - [ ] Explain webhook flow

## Rollback Plan

If issues arise:

### Vercel Rollback
```bash
vercel rollback
```

### Edge Function Rollback
```bash
supabase functions delete stripe_checkout
supabase functions deploy  # Will use previous version
```

### Database Rollback
- Keep backup before major migrations
- Can revert is_premium flag with SQL if needed

## Production Deployment Checklist

Before moving to production:

- [ ] All staging tests passed
- [ ] Test payment with real card details (optional, add to allowlist)
- [ ] All team members have tested flow
- [ ] Error handling is robust
- [ ] Monitoring and alerts are configured
- [ ] Backup and disaster recovery plan exists
- [ ] Email notifications are configured
- [ ] Support team is trained on payment issues
- [ ] Production Stripe keys are configured
- [ ] Database migrations are run in production
- [ ] Edge functions are deployed to production
- [ ] Webhooks are configured for production
- [ ] SSL/TLS certificates are valid
- [ ] API rate limiting is configured
- [ ] Logging and audit trails are in place

## Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Internal**: DevOps/Platform team

## Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Staging Best Practices](https://www.12factor.net/)
