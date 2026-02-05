# Entitlements & Premium Features

## Tiers

### Free Tier
The default tier for all users.
- **Entitlement Code**: `free`
- **Features**:
   - Create Profile
   - Upload Photos (Max 3)
   - View Visible Profiles (Daily Limit: 10)
   - Receive Matches
   - Chat with Matches (Limited to 5 active chats)
   - **NO** "See Who Liked You"
   - **NO** Advanced Filters

### Premium Tier
Paid subscription tier.
- **Entitlement Code**: `premium`
- **Features**:
   - **Unlimited** Swipes/Profile Views
   - **See Who Liked You** (Blur removed)
   - **Unlimited** Active Chats
   - **Advanced Filters** (e.g., Ethnicity, Education, Religiosity)
   - **Priority Support**
   - **Profile Badge** (Premium Member)

## Database Schema Representation

The `entitlements` table tracks the user's current status.

| Column | Type | Description |
| :--- | :--- | :--- |
| `user_id` | `uuid` | Foreign Key to `auth.users` |
| `tier` | `text` | `free` or `premium` |
| `stripe_customer_id` | `text` | Linked Stripe Customer ID |
| `stripe_subscription_id` | `text` | Active Stripe Subscription ID |
| `renews_at` | `timestamptz` | End of current billing period |
| `is_active` | `boolean` | Computed or stored status based on validation |

## Webhook Handling

- **`customer.subscription.created`**: Determine if payment successful -> Set `tier = premium`.
- **`customer.subscription.updated`**: Update `renews_at`. If `cancel_at_period_end` is true, user remains `premium` until `renews_at`.
- **`customer.subscription.deleted`**: Immediate downgrade to `tier = free`.
- **`invoice.payment_failed`**: Depending on retry settings, might eventually lead to `deleted`.

## Client-Side Checks

The client should check `entitlements.tier` to show/hide UI elements (like the "See Who Liked You" blur).
**Security Note**: Vital checks (like "can I send this message?") MUST be enforced by RLS or Edge Functions, not just the client.
