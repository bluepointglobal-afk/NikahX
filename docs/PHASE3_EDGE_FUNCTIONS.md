# NikahX Phase 3: Edge Functions & AI Integrations

This document covers the deployment and configuration of Phase 3 Edge Functions.

## Overview

Phase 3 introduces AI-powered features and advanced notifications:

| Function | Purpose | Trigger |
|----------|---------|---------|
| `firasa_analysis` | AI compatibility analysis using Claude | POST (user request) |
| `mufti_ai_chat` | Islamic Q&A chatbot using Claude | POST (user message) |
| `match_notification` | Notify users & walis of new matches | Webhook/POST |
| `message_notification` | Push/email for new messages | Webhook/POST |
| `wali_approval_alert` | Reminder emails for pending approvals | Cron (6 hours) |
| `smart_match_ranking` | Calculate compatibility scores | Cron (6 hours) |
| `daily_match_digest` | Daily email digest of matches | Cron (9 AM) |

## Prerequisites

1. **Supabase CLI** installed and logged in
2. **Anthropic API Key** for Claude Sonnet 4
3. **SendGrid API Key** (optional, for email)
4. **OneSignal/FCM** credentials (optional, for push)

## Database Migration

First, apply the Phase 3 database migration:

```bash
cd /path/to/NikahX

# Push migration to remote database
supabase db push

# Or run locally first
supabase db reset
```

The migration creates:
- `firasa_reports` - Stores AI compatibility analyses
- `mufti_conversations` & `mufti_messages` - Chat history
- `rate_limit_tracker` - Usage tracking per feature
- `match_ranking_cache` - Cached ranking results
- `notification_logs` - Audit trail for notifications
- `user_presence` - Online/offline status & push tokens
- `currency_cache` - Exchange rates for mahr calculator

## Environment Variables (Secrets)

Set the following secrets in Supabase:

```bash
# Required for AI features
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx

# Optional: Email notifications
supabase secrets set SENDGRID_API_KEY=SG.xxx
supabase secrets set FROM_EMAIL=noreply@nikahx.com
supabase secrets set FROM_NAME=NikahX

# Optional: Push notifications
supabase secrets set ONESIGNAL_APP_ID=xxx
supabase secrets set ONESIGNAL_API_KEY=xxx
# OR
supabase secrets set FCM_SERVER_KEY=xxx

# Optional: Currency API
supabase secrets set FIXER_IO_API_KEY=xxx

# App URL for email links
supabase secrets set APP_URL=https://nikahx.com
```

## Deployment

### Deploy All Functions

```bash
cd supabase/functions

# Deploy each function
supabase functions deploy firasa_analysis
supabase functions deploy mufti_ai_chat
supabase functions deploy match_notification
supabase functions deploy message_notification
supabase functions deploy wali_approval_alert
supabase functions deploy smart_match_ranking
supabase functions deploy daily_match_digest
```

### Set Up Database Webhooks

For automatic notifications on database changes:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhooks:

**Match Created Webhook:**
```
Name: match_created_notification
Table: matches
Events: INSERT
URL: https://<project-ref>.supabase.co/functions/v1/match_notification
Headers: Authorization: Bearer <anon-key>
```

**Message Created Webhook:**
```
Name: message_created_notification
Table: messages
Events: INSERT
URL: https://<project-ref>.supabase.co/functions/v1/message_notification
Headers: Authorization: Bearer <anon-key>
```

### Set Up Cron Jobs

Using Supabase's pg_cron extension or external scheduler:

```sql
-- Wali approval reminders every 6 hours
SELECT cron.schedule(
  'wali-approval-alert',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/wali_approval_alert',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Smart match ranking every 6 hours
SELECT cron.schedule(
  'smart-match-ranking',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/smart_match_ranking',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
    body := '{"force_refresh": true}'::jsonb
  );
  $$
);

-- Daily digest at 9 AM UTC (adjust for timezone)
SELECT cron.schedule(
  'daily-match-digest',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/daily_match_digest',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## API Reference

### Firasa Analysis

```bash
POST /functions/v1/firasa_analysis
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "subject_id": "uuid-of-match",
  "match_id": "optional-match-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "report_id": "uuid",
  "analysis": {
    "compatibility_score": 78,
    "summary": "Strong alignment in religious values...",
    "strengths": [...],
    "concerns": [...],
    "recommendation": "...",
    "questions_to_discuss": [...],
    "dua_reminder": "..."
  },
  "rate_limit": {
    "usage": 1,
    "limit": 5,
    "remaining": 4,
    "is_premium": true
  }
}
```

### Mufti AI Chat

```bash
POST /functions/v1/mufti_ai_chat
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "message": "Is it permissible to...",
  "conversation_id": null  // or existing conversation UUID
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "uuid",
  "response": {
    "summary": "Brief answer...",
    "answer": "Detailed explanation...",
    "sources": ["Quran 30:21", "Bukhari"],
    "confidence": "high",
    "differences_of_opinion": [...],
    "when_to_consult_scholar": [...],
    "safety": {
      "refused": false,
      "reason": null
    }
  },
  "rate_limit": {...}
}
```

### Smart Match Ranking

```bash
POST /functions/v1/smart_match_ranking
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "limit": 50,
  "force_refresh": false
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "total_candidates": 150,
  "candidates": [
    {
      "profile_id": "uuid",
      "total_score": 85,
      "factors": {
        "profile_completeness": 18,
        "preference_alignment": 22,
        "activity_recency": 15,
        "dealbreaker_check": 20,
        "madhab_compatibility": 10,
        "photo_quality": 0
      }
    }
  ]
}
```

## Rate Limits

| Feature | Free Tier | Premium Tier | À La Carte |
|---------|-----------|--------------|------------|
| Firasa | 1/month | 5/month | $4.99 each |
| Mufti AI | 10/day | Unlimited | - |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Cost Estimates

### AI Costs (Claude Sonnet 4)

| Feature | Avg Tokens | Cost per Request |
|---------|------------|------------------|
| Firasa Analysis | ~1500 | ~$0.15 |
| Mufti Chat | ~800 | ~$0.08 |

### Email Costs (SendGrid)

Free tier: 100/day
Paid: ~$0.001 per email

## Local Testing

```bash
# Start Supabase locally
supabase start

# Set secrets in .env.local
ANTHROPIC_API_KEY=sk-ant-xxx

# Serve functions locally
supabase functions serve --env-file .env.local

# Test Firasa analysis
curl -X POST http://localhost:54321/functions/v1/firasa_analysis \
  -H "Authorization: Bearer <test-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"subject_id": "test-user-id"}'
```

## Monitoring

View logs in Supabase Dashboard → Edge Functions → Logs

Or via CLI:
```bash
supabase functions logs firasa_analysis --tail
```

## Security Considerations

1. **Rate Limiting**: Implemented to prevent abuse
2. **Authentication**: All functions require valid JWT
3. **RLS**: Database policies protect user data
4. **Content Filtering**: Mufti AI has safety guardrails for sensitive topics
5. **Logging**: All AI requests are logged for audit

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase functions deploy firasa_analysis
```

### Rate limit errors
Check `rate_limit_tracker` table and verify user's premium status.

### Webhook not triggering
Verify webhook configuration in Dashboard and check Edge Function logs.

---

For questions or issues, see the main documentation or open a GitHub issue.
