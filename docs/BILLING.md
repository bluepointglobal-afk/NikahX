# Billing Implementation

## Products (Stripe)
1. **Premium Plan** (Subscription)
   - ID: `price_premium_monthly`
   - Entitlement: `is_premium = true`
   - Benefits: Unlimited swipes, See who liked you.

2. **Top-Up Likes** (One-time)
   - ID: `price_10_likes`
   - Entitlement: `likes_remaining += 10`

## Flow
1. Client calls `stripe_checkout` with `price_id`.
2. Function returns Stripe URL.
3. User pays.
4. Stripe triggers `stripe_webhook`.
5. Webhook updates `profiles` table using `SUPABASE_SERVICE_ROLE_KEY`.

## Security
- Webhook signature verification ensures events are from Stripe.
- Service Role key is NEVER exposed to client logic.
