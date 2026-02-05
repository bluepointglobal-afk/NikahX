# Acceptance Tests

## 1. Onboarding & Eligibility
- [ ] **Fail**: User under 18 attempts signup (DOB check blocks or flags account).
- [ ] **Pass**: User 18+ successfully creates account.
- [ ] **Pass**: New account has `is_verified: false` by default.

## 2. Verification & Scrubbing
- [ ] **Pass**: User can upload ID document to `verification-docs` bucket.
- [ ] **Fail**: Other users cannot download/view user's ID document.
- [ ] **Pass**: `verify-identity` function runs successfully, updates profile to `verified`.
- [ ] **Pass**: **CRITICAL**: ID document is deleted from storage bucket after verification completes (Data Scrubbing).
- [ ] **Fail**: Unverified user attempts to send a message/match (blocked by RLS/Policy).

## 3. Family Panel (Guardians)
- [ ] **Pass**: Ward can generate invite link for Guardian.
- [ ] **Pass**: Guardian sees Ward's active matches in their dashboard.
- [ ] **Fail**: Guardian attempts to send message *as* the Ward (Impersonation check).
- [ ] **Pass**: Guardian can read chat history of Ward (if opted-in/allowed by policy).
- [ ] **Fail**: Random user attempts to view Ward's matches without `family_connection`.

## 4. Privacy & Retention (90 Days)
- [ ] **Pass**: System identifies records inactive for 89 days (warning logic).
- [ ] **Pass**: System soft-deletes/archives data inactive for 90+ days.
- [ ] **Pass**: Verification metadata audit log remains, but raw PII is gone.
