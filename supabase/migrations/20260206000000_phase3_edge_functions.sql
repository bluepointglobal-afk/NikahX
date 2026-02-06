-- Phase 3 Supplement: Edge Functions Support Tables
-- Dependencies: 20260205000003_phase3_complete.sql
--
-- This migration adds tables required by the Phase 3 Edge Functions:
-- - Rate limiting for AI features
-- - Smart match ranking cache
-- - User presence for push notifications
-- - Currency cache for mahr calculator
-- - Notification logs for audit trail

-- ============================================================================
-- SECTION 1: RATE LIMITING
-- ============================================================================

-- Rate Limit Tracker for AI features (Firasa, Mufti)
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL, -- 'firasa', 'mufti', etc.
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  period_key TEXT NOT NULL, -- e.g., '2026-02' for monthly, '2026-02-06' for daily
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_unique UNIQUE (user_id, feature, period_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_feature 
  ON public.rate_limit_tracker(user_id, feature, period_key);

-- Atomic increment function for rate limiting
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_feature TEXT,
  p_period_type TEXT,
  p_period_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_tracker (user_id, feature, period_type, period_key, usage_count, last_used_at)
  VALUES (p_user_id, p_feature, p_period_type, p_period_key, 1, NOW())
  ON CONFLICT (user_id, feature, period_type, period_key)
  DO UPDATE SET 
    usage_count = rate_limit_tracker.usage_count + 1,
    last_used_at = NOW()
  RETURNING usage_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- ============================================================================
-- SECTION 2: SMART MATCH RANKING CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_ranking_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ranked_profiles JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of {profile_id, score, factors}
  total_candidates INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  CONSTRAINT match_ranking_unique_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_ranking_user 
  ON public.match_ranking_cache(user_id);

CREATE INDEX IF NOT EXISTS idx_match_ranking_expires 
  ON public.match_ranking_cache(expires_at);

-- ============================================================================
-- SECTION 3: USER PRESENCE (for push notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  push_token TEXT, -- FCM or OneSignal token
  push_provider TEXT CHECK (push_provider IN ('fcm', 'onesignal', 'apns'))
);

CREATE INDEX IF NOT EXISTS idx_user_presence_online 
  ON public.user_presence(is_online) WHERE is_online = TRUE;

-- ============================================================================
-- SECTION 4: NOTIFICATION LOGS (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL, -- 'match', 'message', 'wali_reminder', 'digest'
  channel TEXT NOT NULL, -- 'email', 'push', 'sms'
  reference_id UUID, -- match_id, message_id, etc.
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user 
  ON public.notification_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type 
  ON public.notification_logs(notification_type, created_at DESC);

-- ============================================================================
-- SECTION 5: CURRENCY CACHE (for mahr calculator)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.currency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  rates JSONB NOT NULL, -- {SAR: 3.75, AED: 3.67, ...}
  gold_price_usd NUMERIC(10,2), -- per troy ounce
  silver_price_usd NUMERIC(10,2), -- per troy ounce
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ============================================================================
-- SECTION 6: RLS POLICIES
-- ============================================================================

-- rate_limit_tracker (user can read own, service role writes)
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limit_select_own" ON public.rate_limit_tracker;
CREATE POLICY "rate_limit_select_own"
  ON public.rate_limit_tracker FOR SELECT
  USING (auth.uid() = user_id);

-- match_ranking_cache (user can read own, service role writes)
ALTER TABLE public.match_ranking_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_select_own" ON public.match_ranking_cache;
CREATE POLICY "ranking_select_own"
  ON public.match_ranking_cache FOR SELECT
  USING (auth.uid() = user_id);

-- notification_logs (user can see their own)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_log_select_own" ON public.notification_logs;
CREATE POLICY "notif_log_select_own"
  ON public.notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- user_presence (user can manage their own)
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select_own" ON public.user_presence;
CREATE POLICY "presence_select_own"
  ON public.user_presence FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_upsert_own" ON public.user_presence;
CREATE POLICY "presence_upsert_own"
  ON public.user_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_update_own" ON public.user_presence;
CREATE POLICY "presence_update_own"
  ON public.user_presence FOR UPDATE
  USING (auth.uid() = user_id);

-- currency_cache: Public read (no user-specific data)
ALTER TABLE public.currency_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "currency_cache_select_all" ON public.currency_cache;
CREATE POLICY "currency_cache_select_all"
  ON public.currency_cache FOR SELECT
  USING (true);

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS
-- ============================================================================

-- Check if user is premium
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_premium FROM public.profiles WHERE id = p_user_id),
    FALSE
  );
$$;

-- Get rate limit usage for a feature
CREATE OR REPLACE FUNCTION public.get_rate_limit_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period_type TEXT,
  p_period_key TEXT
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT usage_count FROM public.rate_limit_tracker
     WHERE user_id = p_user_id 
       AND feature = p_feature 
       AND period_type = p_period_type
       AND period_key = p_period_key),
    0
  );
$$;

-- Get pending wali matches older than threshold
CREATE OR REPLACE FUNCTION public.get_pending_wali_matches(p_hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE(
  match_id UUID,
  user1_id UUID,
  user2_id UUID,
  user1_name TEXT,
  user2_name TEXT,
  user1_email TEXT,
  user2_email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    m.id AS match_id,
    m.user1_id,
    m.user2_id,
    p1.full_name AS user1_name,
    p2.full_name AS user2_name,
    p1.email AS user1_email,
    p2.email AS user2_email,
    m.created_at
  FROM public.matches m
  JOIN public.profiles p1 ON p1.id = m.user1_id
  JOIN public.profiles p2 ON p2.id = m.user2_id
  WHERE m.status = 'pending_wali'
    AND m.is_active = TRUE
    AND m.created_at < (NOW() - (p_hours_threshold || ' hours')::INTERVAL);
$$;

-- ============================================================================
-- SECTION 8: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add mufti_messages columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mufti_messages' 
    AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE public.mufti_conversations 
      ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
      
    -- Create mufti_messages if not exists with all needed columns
    CREATE TABLE IF NOT EXISTS public.mufti_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES public.mufti_conversations(id) ON DELETE CASCADE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      tokens_used INTEGER,
      model_version TEXT,
      safety_flags TEXT[],
      sources JSONB,
      confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_mufti_messages_conversation 
      ON public.mufti_messages(conversation_id, created_at);
  END IF;
END
$$;

-- Add firasa_reports columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firasa_reports' 
    AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE public.firasa_reports 
      ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
      ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(6,4),
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE public.rate_limit_tracker IS 'Tracks usage counts for rate-limited features (Firasa, Mufti AI)';
COMMENT ON TABLE public.match_ranking_cache IS 'Cached smart match rankings with 24h TTL';
COMMENT ON TABLE public.user_presence IS 'User online status and push notification tokens';
COMMENT ON TABLE public.notification_logs IS 'Audit trail for all notifications sent';
COMMENT ON TABLE public.currency_cache IS 'Cached exchange rates and precious metal prices for mahr calculator';
