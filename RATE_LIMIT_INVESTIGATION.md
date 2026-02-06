# NikahX Rate Limit Investigation

**Date:** 2026-02-05 04:44 PST  
**Issue:** "email rate limit exceeded" blocking all signups on production

## Root Cause

The error `over_email_send_rate_limit` is a **Supabase Auth backend rate limit**, not frontend code.

This is controlled by Supabase project settings, specifically:
- **Auth → Rate Limits → Email Send Rate Limit**
- Default: Very conservative (often 3-5 emails per hour per IP)

## Evidence

1. Error persists across different email addresses (confirms IP-based)
2. Error code `over_email_send_rate_limit` is a Supabase Auth error type
3. No rate limiting code exists in our frontend codebase
4. This is a **Supabase Dashboard configuration**, not code issue

## Fix Location

**Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
2. Navigate to **Authentication → Rate Limits**
3. Increase **Email Send Rate Limit** from default to higher threshold
4. Recommended: 30-50 emails/hour for production, or disable for testing

## Temporary Workaround

For testing, you can:
1. Use different IP addresses (VPN)
2. Wait for rate limit window to reset (typically 1 hour)
3. Create test accounts via Supabase Dashboard directly (bypasses rate limit)

## Production Recommendation

- Set email rate limit to **50/hour** minimum for production
- Monitor abuse patterns via Supabase Analytics
- Consider CAPTCHA for additional protection (not rate limits)

## Status

**BLOCKED:** Requires Supabase Dashboard access to adjust rate limit settings.  
**Impact:** CRITICAL - Zero user acquisition possible until fixed.
