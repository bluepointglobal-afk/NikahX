# Stripe Payment Testing Guide for NikahX

## Prerequisites

### 1. Stripe Account Setup
- Create account at [stripe.com](https://stripe.com)
- Navigate to Dashboard (Viewing **test data**)
- Obtain test keys:
  - **Publishable Key**: `pk_test_51SxZKe4b4Crudawq7lU09S7B`
  - **Secret Key**: `sk_test_51SxZKe4b4Crudawq7lU09S7B_test`
  - **Webhook Secret**: `whsec_1SxZKe4b4Crudawq7lU09S7B_test`

### 2. Environment Setup

Verify `.env.local` contains:
```
STRIPE_SECRET_KEY=sk_test_51SxZKe4b4Crudawq7lU09S7B_test
STRIPE_WEBHOOK_SECRET=whsec_1SxZKe4b4Crudawq7lU09S7B_test
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

Verify `frontend-test/.env` contains:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
```

### 3. Install Stripe CLI (Optional but Recommended)

For webhook testing:
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

## Local Testing Steps

### Step 1: Start Frontend Dev Server

```bash
cd frontend-test
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Step 2: Create/Login Test User

1. Visit `http://localhost:5173/auth`
2. Create test account with email: `test@example.com`
3. Verify email (check Supabase dashboard)
4. Complete onboarding to reach home page

### Step 3: Test Premium Signup Flow

1. From home page, click "Upgrade to Premium" or navigate to `/premium`
2. You should see the Premium page with features and "Upgrade to Premium" button
3. Click the button - it will call `stripe_checkout` edge function
4. You'll be redirected to Stripe Hosted Checkout

### Step 4: Complete Test Payment

1. **Test Card Details**:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3-digit number (e.g., `123`)
   - Name: Any name
   - Email: Email from step 2 (test@example.com)
   - ZIP: Any 5 digits (e.g., `12345`)

2. Click "Pay" or "Complete payment"

3. You'll be redirected to `http://localhost:5173/subscription/success?success=true`

### Step 5: Verify Premium Status

On the success page:
- ✅ Should show "You're Premium. JazakAllahu khairan!"
- ✅ Should show premium_until date
- Click "Go to subscription settings"
- Navigate to `/account/subscription`
- ✅ Should show "Premium" status
- ✅ Button should say "Manage billing in Stripe"

## Webhook Testing (Optional)

### With Stripe CLI

For local webhook testing during development:

```bash
# In a new terminal
stripe listen --forward-to http://localhost:3000/stripe_webhook

# The command will output a webhook signing secret
# Copy this and update STRIPE_WEBHOOK_SECRET in .env.local
```

### Manual Webhook Testing

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create webhook endpoint:
   - URL: `http://localhost:3000/stripe_webhook` (for local testing with ngrok)
   - Or: Your staging URL for production testing
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`

## Test Scenarios

### Scenario 1: Successful Payment

**Test Card**: `4242 4242 4242 4242`

**Expected Flow**:
1. ✅ Checkout page loads
2. ✅ Payment completes successfully
3. ✅ Redirects to success page
4. ✅ Premium status updates in database
5. ✅ User can access premium features
6. ✅ Stripe portal button works

**Verification**:
```sql
-- Check in Supabase
SELECT id, is_premium, premium_until, stripe_customer_id, stripe_subscription_id
FROM profiles WHERE id = 'your-user-id';
```

### Scenario 2: Payment Declined

**Test Card**: `4000 0000 0000 0002`

**Expected Flow**:
1. ✅ Checkout page loads
2. ❌ Payment declines with error message
3. ✅ Redirects to success page with canceled message
4. ✅ Premium status remains unchanged

### Scenario 3: 3D Secure Authentication

**Test Card**: `4000 0025 0000 3155`

**Expected Flow**:
1. ✅ Checkout page loads
2. ✅ Redirects to 3D Secure authentication page
3. ✅ Complete authentication (check phone, etc.)
4. ✅ Payment completes
5. ✅ Premium status updates

### Scenario 4: Subscription Cancellation

1. Login to Stripe Dashboard
2. Find customer by email (test@example.com)
3. Cancel subscription
4. ✅ Webhook fires `customer.subscription.deleted`
5. ✅ Database updates: `is_premium = false`
6. ✅ User sees "Free" status on subscription page

## Troubleshooting

### Issue: "Missing VITE_STRIPE_PRICE_ID env var"

**Solution**:
```bash
# Verify frontend-test/.env has the key
grep VITE_STRIPE_PRICE_ID frontend-test/.env

# If missing, add it:
echo 'VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B' >> frontend-test/.env
```

### Issue: "Failed to load Stripe" in console

**Solution**:
1. Check browser console for detailed error
2. Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
3. Ensure you're in test mode (not trying to use live keys)
4. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Issue: Checkout page doesn't load

**Solution**:
1. Check network tab for failed requests
2. Verify `stripe_checkout` edge function is deployed:
   ```bash
   supabase functions list
   ```
3. Check function logs:
   ```bash
   supabase functions logs stripe_checkout
   ```

### Issue: Premium status doesn't update after payment

**Solution**:
1. **Check webhook secret** (most common issue):
   ```bash
   # Verify in Stripe Dashboard → Developers → Webhooks
   # The signing secret should match STRIPE_WEBHOOK_SECRET
   ```

2. **Check webhook delivery** in Stripe Dashboard:
   - Go to Developers → Webhooks
   - Find your endpoint
   - Click "Events" tab
   - Look for `checkout.session.completed` event
   - Check the timestamp and response

3. **Check function logs**:
   ```bash
   supabase functions logs stripe_webhook
   ```

4. **Verify database update manually**:
   ```sql
   SELECT * FROM profiles WHERE id = 'your-user-id';
   ```

### Issue: "stripe_portal" button fails

**Solution**:
1. User must have completed a payment first (should have `stripe_customer_id`)
2. Verify `stripe_portal` function is deployed
3. Check function logs: `supabase functions logs stripe_portal`
4. Verify user has proper authentication in browser

## Testing Checklist

- [ ] Environment variables configured in all .env files
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] User can complete signup flow
- [ ] Premium page loads correctly
- [ ] Checkout initiates and loads Stripe hosted page
- [ ] Test payment with 4242 card completes successfully
- [ ] Success page shows premium status updated
- [ ] Database shows is_premium=true and stripe_customer_id populated
- [ ] Subscription management page shows "Premium" status
- [ ] Stripe portal button opens without errors
- [ ] Declined payment (4000 0000 0000 0002) shows error
- [ ] Webhook successfully updates database after payment

## Advanced Testing

### Testing Email Notifications

1. Configure Stripe email templates in Stripe Dashboard
2. Use a real email instead of test@example.com
3. Verify confirmation emails are received

### Testing Subscription Renewal

1. Complete a test payment
2. In Stripe Dashboard, manually trigger invoice.paid event
3. Verify database updates correctly

### Load Testing

1. Use Apache Bench (ab) to test edge functions:
   ```bash
   ab -n 100 -c 10 http://localhost:3000/stripe_checkout
   ```
2. Monitor function logs for performance issues

## Next Steps: Staging Deployment

Once local testing is complete:

1. Deploy frontend to staging (Vercel)
2. Update Stripe webhook endpoint to staging URL
3. Create Stripe product and price in dashboard
4. Configure database migration for production
5. Deploy edge functions to production Supabase project
6. Run end-to-end tests in staging with test payment card
7. Get sign-off from product team

See `STRIPE_INTEGRATION.md` for deployment details.
