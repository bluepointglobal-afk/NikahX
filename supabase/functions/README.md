This directory contains Supabase Edge Functions.

## Shared Code
Put shared logic (DB clients, types, validation) in `_shared/`.
Import via `import { ... } from "../_shared/mod.ts"`.

## Structure
- `stripe_checkout/`: Create Stripe Checkout session.
- `stripe_portal/`: Create Stripe Billing Portal session (returns URL for customer to manage billing).
- `stripe_webhook/`: Stripe webhook handler (signature verified) -> updates `profiles` premium state.
- `invite_guardian/`: Creates a wali invite code (out-of-band delivery for MVP).
- `accept_guardian_invite/`: Wali accepts invite code, activates wali link.
- `report_user/`: User reports.
- `admin_moderation/`: Admin moderation endpoints.
- `ai_compatibility/`, `ai_ask_mufti/`: AI features.
