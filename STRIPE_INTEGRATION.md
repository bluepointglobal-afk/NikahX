# Stripe Payment Integration Guide

## Overview
This document outlines the Stripe payment processing integration for NikahPlus (NikahX), including setup, testing, and deployment.

## Architecture

### Components
1. **Frontend**: React + Vite with Stripe.js integration
2. **Backend**: Supabase Edge Functions for Stripe operations
3. **Database**: Supabase PostgreSQL for subscription tracking
4. **Webhooks**: Stripe webhooks for subscription event handling

### Flow Diagram
```
User (Premium Signup) 
  → Premium.tsx (Initiate Checkout)
  → Supabase Edge Function (stripe_checkout)
  → Stripe Hosted Checkout
  → Payment Completion
  → Stripe Webhook (stripe_webhook)
  → Database Update (is_premium, stripe_customer_id, etc.)
  → SubscriptionSuccess.tsx (Confirmation)
```

## Environment Configuration

### Root .env.local
```
STRIPE_SECRET_KEY=sk_test_51SxZKe4b4Crudawq7lU09S7B_test
STRIPE_WEBHOOK_SECRET=whsec_1SxZKe4b4Crudawq7lU09S7B_test
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

### Frontend .env
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

### Frontend .env.production
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

## Testing Stripe Integration

### Local Testing with Stripe CLI

1. **Install Stripe CLI**
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe Account**
   ```bash
   stripe login
   ```

3. **Forward Webhooks Locally**
   ```bash
   stripe listen --forward-to http://localhost:3000/stripe_webhook
   ```

4. **Get Webhook Secret**
   The output will show a webhook signing secret. Update your `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx...
   ```

### Test Payment

1. Navigate to Premium page: `http://localhost:5173/premium`
2. Click "Upgrade to Premium"
3. Use Stripe test card credentials:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3-digit number (e.g., `123`)
   - **ZIP**: Any 5-digit number (e.g., `12345`)

4. Complete checkout
5. Verify success page shows Premium status
6. Check `/account/subscription` to confirm premium status persists

### Test Declined Payment

Use test card: `4000 0000 0000 0002`
- Will decline with "Your card was declined" message

### Test 3D Secure (if enabled)

Use test card: `4000 0025 0000 3155`
- Will show authentication prompt

## Supabase Edge Functions

### stripe_checkout
**Path**: `supabase/functions/stripe_checkout/index.ts`

Initiates a Stripe Checkout session:
- Input: `price_id`, `redirect_url`
- Output: `{ url: "https://checkout.stripe.com/..." }`
- Auth: Requires Authorization header with valid session token

### stripe_portal
**Path**: `supabase/functions/stripe_portal/index.ts`

Opens Stripe Customer Portal for subscription management:
- Input: `return_url`
- Output: `{ url: "https://billing.stripe.com/..." }`
- Auth: Requires Authorization header with valid session token

### stripe_webhook
**Path**: `supabase/functions/stripe_webhook/index.ts`

Handles Stripe webhook events:
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
- Updates profiles table with premium status, customer ID, subscription ID, and premium_until date

## Database Schema

### profiles table updates
```sql
-- Existing columns (ensure these exist):
ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN premium_until TIMESTAMP;
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_is_premium ON profiles(is_premium);
```

## Frontend Pages

### Premium.tsx
- **Route**: `/premium`
- **Purpose**: Display premium features and initiate checkout
- **Env Vars**: `VITE_STRIPE_PRICE_ID`
- **Flow**:
  1. User clicks "Upgrade to Premium"
  2. Calls `supabase.functions.invoke('stripe_checkout', ...)`
  3. Redirects to Stripe Hosted Checkout
  4. After payment, redirects back to `/subscription/success`

### Subscription.tsx
- **Route**: `/account/subscription`
- **Purpose**: Show current subscription status
- **Features**:
  - Display "Premium" or "Free" status
  - Show premium_until date
  - Button to manage billing in Stripe portal
  - Button to upgrade to premium

### SubscriptionSuccess.tsx
- **Route**: `/subscription/success`
- **Purpose**: Handle post-checkout redirect
- **Features**:
  - Checks for `?success=true` or `?canceled=true` query params
  - Polls database for updated premium status
  - Shows confirmation or retry message

## Deployment

### Staging Deployment

1. **Build Frontend**
   ```bash
   cd frontend-test
   npm install
   npm run build
   ```

2. **Deploy to Vercel** (or your staging platform)
   ```bash
   vercel deploy --prod
   ```

3. **Update Stripe Settings**
   - Add staging URL to Stripe webhook endpoints
   - Example: `https://nikahx-staging.vercel.app/stripe_webhook`
   - Update return URLs for checkout redirect

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy stripe_checkout
   supabase functions deploy stripe_portal
   supabase functions deploy stripe_webhook
   ```

5. **Test in Staging**
   - Use same test card: `4242 4242 4242 4242`
   - Verify end-to-end flow works

## Stripe Dashboard Configuration

### Required Setup
1. Create a Subscription Product in Stripe Dashboard
2. Add Price: Choose recurring billing (monthly/yearly)
3. Get Price ID (e.g., `price_1SxZKe4b4Crudawq7lU09S7B`)
4. Configure Webhook Endpoints:
   - URL: `https://your-staging-url.com/stripe_webhook`
   - Events: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`

## Troubleshooting

### Issue: "Missing VITE_STRIPE_PRICE_ID env var"
**Solution**: Ensure `.env` or `.env.local` in frontend-test directory has `VITE_STRIPE_PRICE_ID` set

### Issue: Stripe portal button fails
**Solution**: Ensure `stripe_portal` edge function is deployed and user has `stripe_customer_id` in profiles table (set after first successful payment)

### Issue: Premium status doesn't update after payment
**Causes**:
1. Webhook not received - Check Stripe webhook logs
2. Webhook secret mismatch - Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Function not deployed - Verify `stripe_webhook` function is active in Supabase

**Debug Steps**:
1. Check Supabase function logs: `supabase functions logs stripe_webhook`
2. Check Stripe webhook logs in Stripe Dashboard
3. Verify `profiles` table has the `stripe_*` columns

### Issue: Payment test card doesn't work
**Solution**: Ensure you're using Stripe test mode
1. In Stripe Dashboard, toggle to "Viewing test data"
2. Use test cards from Stripe docs
3. Verify `STRIPE_SECRET_KEY` starts with `sk_test_`

## Production Considerations

1. **Use Production Keys**
   - Switch to `pk_live_` and `sk_live_` keys
   - Update in `.env.production`

2. **Enable 3D Secure**
   - Recommended for security and compliance
   - Configure in Stripe Dashboard > Settings > Authentication

3. **Email Notifications**
   - Configure Stripe email templates
   - Test with real email addresses

4. **Monitoring**
   - Set up Stripe webhook monitoring
   - Monitor Edge Function logs for errors
   - Set up alerts for failed payments

## Security Checklist

- [ ] Production keys never committed to git
- [ ] Webhook secret stored securely (environment variable)
- [ ] CORS properly configured for frontend
- [ ] Edge function authentication verified
- [ ] Database policies restrict access to own profile
- [ ] Test payment flow end-to-end
- [ ] Verify webhook signature validation

## Support & Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe React Setup](https://stripe.com/docs/stripe-js/react)
