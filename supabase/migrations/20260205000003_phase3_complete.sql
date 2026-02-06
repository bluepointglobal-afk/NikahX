-- ============================================================================
-- NikahX Phase 3: Complete Database Layer
-- Migration: 20260205000003_phase3_complete.sql
-- 
-- Features:
--   - Enhanced messaging with read receipts
--   - Mahr calculation and agreement tracking
--   - Firasa (character insight) reports
--   - Family approval workflow
--   - AI Mufti conversations
--   - User blocking with discovery filtering
--   - Granular family permissions
--   - Comprehensive triggers for match/notification workflows
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'swipe_action_enum') THEN
    CREATE TYPE public.swipe_action_enum AS ENUM ('like', 'pass', 'super_like');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_approval_status_enum') THEN
    CREATE TYPE public.family_approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'deferred');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'madhab_enum') THEN
    CREATE TYPE public.madhab_enum AS ENUM ('hanafi', 'maliki', 'shafii', 'hanbali', 'other');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_reason_enum') THEN
    CREATE TYPE public.block_reason_enum AS ENUM ('harassment', 'inappropriate', 'spam', 'other', 'unspecified');
  END IF;
END
$$;

-- ============================================================================
-- SECTION 2: ALTER EXISTING TABLES
-- ============================================================================

-- 2.1 Enhance messages table with soft delete
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for non-deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_match_active 
  ON public.messages(match_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3: NEW TABLES
-- ============================================================================

-- 3.1 MESSAGE READ RECEIPTS
-- Tracks when each participant reads a message
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_message_read UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON public.message_read_receipts(user_id);

-- 3.2 BLOCKED USERS
-- Allows users to block others, filters from discovery
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason public.block_reason_enum DEFAULT 'unspecified',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_block UNIQUE(blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON public.blocked_users(blocked_id);
-- Composite index for discovery filtering
CREATE INDEX IF NOT EXISTS idx_blocked_both ON public.blocked_users(blocker_id, blocked_id);

-- 3.3 FAMILY PERMISSIONS
-- Granular permissions for wali oversight
CREATE TABLE IF NOT EXISTS public.family_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wali_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ward_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  can_view_matches BOOLEAN DEFAULT TRUE,
  can_approve_matches BOOLEAN DEFAULT TRUE,
  can_view_messages BOOLEAN DEFAULT FALSE,
  can_veto_matches BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_family_permission UNIQUE(wali_id, ward_id),
  CONSTRAINT no_self_wali CHECK (wali_id <> ward_id)
);

CREATE INDEX IF NOT EXISTS idx_family_perm_wali ON public.family_permissions(wali_id);
CREATE INDEX IF NOT EXISTS idx_family_perm_ward ON public.family_permissions(ward_id);

-- 3.4 FAMILY APPROVALS
-- Tracks wali decisions on specific matches
CREATE TABLE IF NOT EXISTS public.family_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  wali_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ward_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.family_approval_status_enum DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_family_approval UNIQUE(match_id, wali_id, ward_id)
);

CREATE INDEX IF NOT EXISTS idx_family_approval_match ON public.family_approvals(match_id);
CREATE INDEX IF NOT EXISTS idx_family_approval_wali ON public.family_approvals(wali_id);
CREATE INDEX IF NOT EXISTS idx_family_approval_ward ON public.family_approvals(ward_id);

-- 3.5 MAHR CALCULATIONS
-- Islamic dower tracking with regional context
CREATE TABLE IF NOT EXISTS public.mahr_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  
  -- Monetary amounts
  immediate_amount DECIMAL(15,2),
  deferred_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  
  -- Islamic context
  madhab public.madhab_enum,
  gold_grams_equivalent DECIMAL(10,3),
  regional_percentile INT CHECK (regional_percentile BETWEEN 0 AND 100),
  
  -- Agreement tracking
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  agreed_by_user BOOLEAN DEFAULT FALSE,
  agreed_by_user_at TIMESTAMPTZ,
  agreed_by_match BOOLEAN DEFAULT FALSE,
  agreed_by_match_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_mahr_per_user_match UNIQUE(user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_mahr_match ON public.mahr_calculations(match_id);
CREATE INDEX IF NOT EXISTS idx_mahr_user ON public.mahr_calculations(user_id);

-- 3.6 FIRASA REPORTS
-- AI-generated character analysis/compatibility insights
CREATE TABLE IF NOT EXISTS public.firasa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  
  -- Analysis results
  compatibility_score INT CHECK (compatibility_score BETWEEN 0 AND 100),
  character_analysis JSONB DEFAULT '{}'::jsonb,
  strengths TEXT[] DEFAULT '{}',
  concerns TEXT[] DEFAULT '{}',
  islamic_considerations JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  model_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firasa_requester ON public.firasa_reports(requester_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_firasa_subject ON public.firasa_reports(subject_id);
CREATE INDEX IF NOT EXISTS idx_firasa_match ON public.firasa_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_firasa_expiry ON public.firasa_reports(expires_at) WHERE expires_at IS NOT NULL;

-- 3.7 MUFTI CONVERSATIONS
-- AI Islamic guidance chat history
CREATE TABLE IF NOT EXISTS public.mufti_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Conversation content
  topic TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  -- Format: [{role: 'user'|'assistant', content: '...', timestamp: '...'}]
  
  -- Context reference (optional link to match for context)
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  
  -- Status
  is_archived BOOLEAN DEFAULT FALSE,
  summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mufti_user ON public.mufti_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mufti_topic ON public.mufti_conversations(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_mufti_active ON public.mufti_conversations(user_id) WHERE is_archived = FALSE;

-- 3.8 NOTIFICATIONS TABLE (for trigger-generated notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

-- 4.1 Check if user is participant in a match
CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id
    AND (m.user1_id = p_user_id OR m.user2_id = p_user_id)
  );
$$;

-- 4.2 Get the other user in a match
CREATE OR REPLACE FUNCTION public.get_match_partner(p_match_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN m.user1_id = p_user_id THEN m.user2_id
    ELSE m.user1_id
  END
  FROM public.matches m
  WHERE m.id = p_match_id
  AND (m.user1_id = p_user_id OR m.user2_id = p_user_id);
$$;

-- 4.3 Check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id UUID, p_other_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = p_other_id)
       OR (blocker_id = p_other_id AND blocked_id = p_user_id)
  );
$$;

-- 4.4 Check if wali has permission for ward
CREATE OR REPLACE FUNCTION public.wali_has_permission(p_wali_id UUID, p_ward_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE p_permission
    WHEN 'view_matches' THEN COALESCE(fp.can_view_matches, FALSE)
    WHEN 'approve_matches' THEN COALESCE(fp.can_approve_matches, FALSE)
    WHEN 'view_messages' THEN COALESCE(fp.can_view_messages, FALSE)
    WHEN 'veto_matches' THEN COALESCE(fp.can_veto_matches, FALSE)
    ELSE FALSE
  END
  FROM public.family_permissions fp
  WHERE fp.wali_id = p_wali_id AND fp.ward_id = p_ward_id;
$$;

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- 5.1 TRIGGER: On mutual like → Create active match
CREATE OR REPLACE FUNCTION public.trigger_check_mutual_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reverse_like BOOLEAN;
  v_user1 UUID;
  v_user2 UUID;
  v_new_match_id UUID;
  v_existing_match UUID;
BEGIN
  -- Only trigger on 'like' actions
  IF NEW.action NOT IN ('like', 'super_like') THEN
    RETURN NEW;
  END IF;
  
  -- Check for reverse like
  SELECT EXISTS(
    SELECT 1 FROM public.swipes
    WHERE actor_id = NEW.target_id
    AND target_id = NEW.actor_id
    AND action IN ('like', 'super_like')
  ) INTO v_reverse_like;
  
  IF v_reverse_like THEN
    -- Stable ordering for match
    IF NEW.actor_id < NEW.target_id THEN
      v_user1 := NEW.actor_id;
      v_user2 := NEW.target_id;
    ELSE
      v_user1 := NEW.target_id;
      v_user2 := NEW.actor_id;
    END IF;
    
    -- Check if match already exists
    SELECT id INTO v_existing_match
    FROM public.matches
    WHERE user1_id = v_user1 AND user2_id = v_user2;
    
    IF v_existing_match IS NULL THEN
      -- Create new match (status depends on wali requirement)
      INSERT INTO public.matches(user1_id, user2_id, status)
      VALUES (v_user1, v_user2, 'pending_wali')
      RETURNING id INTO v_new_match_id;
      
      -- Create family approval records if walis exist
      INSERT INTO public.family_approvals(match_id, wali_id, ward_id, status)
      SELECT v_new_match_id, wl.wali_user_id, wl.ward_id, 'pending'
      FROM public.wali_links wl
      WHERE wl.ward_id IN (v_user1, v_user2)
        AND wl.status = 'active'
        AND wl.wali_user_id IS NOT NULL;
      
      -- Notify both users of match
      INSERT INTO public.notifications(user_id, type, title, body, data)
      VALUES 
        (v_user1, 'match', 'New Match!', 'You have a new potential match. Pending wali approval.', 
         jsonb_build_object('match_id', v_new_match_id)),
        (v_user2, 'match', 'New Match!', 'You have a new potential match. Pending wali approval.', 
         jsonb_build_object('match_id', v_new_match_id));
      
      -- Notify walis
      INSERT INTO public.notifications(user_id, type, title, body, data)
      SELECT wl.wali_user_id, 'wali_review', 'Match Review Required',
             'Your ward has a new match requiring your review.',
             jsonb_build_object('match_id', v_new_match_id, 'ward_id', wl.ward_id)
      FROM public.wali_links wl
      WHERE wl.ward_id IN (v_user1, v_user2)
        AND wl.status = 'active'
        AND wl.wali_user_id IS NOT NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_mutual_match ON public.swipes;
CREATE TRIGGER trg_check_mutual_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_mutual_match();

-- 5.2 TRIGGER: On match status change → Notify wali + users
CREATE OR REPLACE FUNCTION public.trigger_match_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify both users
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES 
      (NEW.user1_id, 'match_status', 'Match Status Updated',
       'Your match status has changed to: ' || NEW.status::text,
       jsonb_build_object('match_id', NEW.id, 'status', NEW.status)),
      (NEW.user2_id, 'match_status', 'Match Status Updated',
       'Your match status has changed to: ' || NEW.status::text,
       jsonb_build_object('match_id', NEW.id, 'status', NEW.status));
    
    -- Notify walis
    INSERT INTO public.notifications(user_id, type, title, body, data)
    SELECT wl.wali_user_id, 'wali_match_update', 'Ward Match Updated',
           'Your ward''s match status has changed to: ' || NEW.status::text,
           jsonb_build_object('match_id', NEW.id, 'ward_id', wl.ward_id, 'status', NEW.status)
    FROM public.wali_links wl
    WHERE wl.ward_id IN (NEW.user1_id, NEW.user2_id)
      AND wl.status = 'active'
      AND wl.wali_user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_status_change ON public.matches;
CREATE TRIGGER trg_match_status_change
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_match_status_change();

-- 5.3 TRIGGER: On new message → Notify recipient
CREATE OR REPLACE FUNCTION public.trigger_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id UUID;
BEGIN
  -- Get recipient (the other person in the match)
  v_recipient_id := public.get_match_partner(NEW.match_id, NEW.sender_id);
  
  IF v_recipient_id IS NOT NULL THEN
    -- Create notification for recipient
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      v_recipient_id,
      'new_message',
      'New Message',
      'You have a new message',
      jsonb_build_object('match_id', NEW.match_id, 'message_id', NEW.id)
    );
    
    -- Also notify walis who have message viewing permission
    INSERT INTO public.notifications(user_id, type, title, body, data)
    SELECT fp.wali_id, 'wali_message', 'Ward Received Message',
           'Your ward has received a new message.',
           jsonb_build_object('match_id', NEW.match_id, 'ward_id', fp.ward_id)
    FROM public.family_permissions fp
    WHERE fp.ward_id = v_recipient_id
      AND fp.can_view_messages = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_message ON public.messages;
CREATE TRIGGER trg_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_message();

-- 5.4 TRIGGER: On mahr agreement → Check if both agreed, notify
CREATE OR REPLACE FUNCTION public.trigger_mahr_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_both_agreed BOOLEAN;
  v_partner_id UUID;
  v_match public.matches%ROWTYPE;
BEGIN
  -- Check if this update results in both parties agreeing
  IF NEW.agreed_by_user = TRUE AND NEW.agreed_by_match = TRUE 
     AND (OLD.agreed_by_user = FALSE OR OLD.agreed_by_match = FALSE) THEN
    
    -- Mark as finalized
    NEW.finalized_at := NOW();
    
    -- Get match info
    SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id;
    
    -- Notify both parties
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES 
      (v_match.user1_id, 'mahr_agreed', 'Mahr Agreement Finalized',
       'Both parties have agreed to the mahr terms.',
       jsonb_build_object('match_id', NEW.match_id, 'mahr_id', NEW.id)),
      (v_match.user2_id, 'mahr_agreed', 'Mahr Agreement Finalized',
       'Both parties have agreed to the mahr terms.',
       jsonb_build_object('match_id', NEW.match_id, 'mahr_id', NEW.id));
    
    -- Notify walis
    INSERT INTO public.notifications(user_id, type, title, body, data)
    SELECT wl.wali_user_id, 'wali_mahr_agreed', 'Mahr Agreement Reached',
           'Your ward has finalized a mahr agreement.',
           jsonb_build_object('match_id', NEW.match_id, 'ward_id', wl.ward_id)
    FROM public.wali_links wl
    WHERE wl.ward_id IN (v_match.user1_id, v_match.user2_id)
      AND wl.status = 'active'
      AND wl.wali_user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mahr_agreement ON public.mahr_calculations;
CREATE TRIGGER trg_mahr_agreement
  BEFORE UPDATE ON public.mahr_calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_mahr_agreement();

-- 5.5 TRIGGER: Family approval status change
CREATE OR REPLACE FUNCTION public.trigger_family_approval_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_all_approved BOOLEAN;
BEGIN
  -- Update reviewed_at timestamp
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.reviewed_at := NOW();
    
    -- Notify the ward
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      NEW.ward_id,
      'wali_decision',
      'Wali Decision',
      'Your wali has ' || NEW.status::text || ' your match.',
      jsonb_build_object('match_id', NEW.match_id, 'status', NEW.status)
    );
    
    -- If approved, check if all walis have approved
    IF NEW.status = 'approved' THEN
      SELECT NOT EXISTS(
        SELECT 1 FROM public.family_approvals fa
        WHERE fa.match_id = NEW.match_id
        AND fa.status <> 'approved'
      ) INTO v_all_approved;
      
      IF v_all_approved THEN
        -- Update match status to active
        UPDATE public.matches
        SET status = 'active'
        WHERE id = NEW.match_id
        AND status = 'pending_wali';
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      -- Any rejection means match is rejected
      UPDATE public.matches
      SET status = 'rejected', is_active = FALSE
      WHERE id = NEW.match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_approval_change ON public.family_approvals;
CREATE TRIGGER trg_family_approval_change
  BEFORE UPDATE ON public.family_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_family_approval_change();

-- 5.6 TRIGGER: Auto-update updated_at
CREATE TRIGGER update_family_permissions_modtime
  BEFORE UPDATE ON public.family_permissions
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_family_approvals_modtime
  BEFORE UPDATE ON public.family_approvals
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_mahr_calculations_modtime
  BEFORE UPDATE ON public.mahr_calculations
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_mufti_conversations_modtime
  BEFORE UPDATE ON public.mufti_conversations
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahr_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firasa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mufti_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6.1 SWIPES RLS (extending existing)
-- Users can view swipes they received (for mutual match detection)
DROP POLICY IF EXISTS "Users can view received swipes" ON public.swipes;
CREATE POLICY "Users can view received swipes"
  ON public.swipes FOR SELECT
  USING (auth.uid() = target_id);

-- 6.2 MESSAGE READ RECEIPTS RLS
DROP POLICY IF EXISTS "Participants can view read receipts" ON public.message_read_receipts;
CREATE POLICY "Participants can view read receipts"
  ON public.message_read_receipts FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.messages msg
      JOIN public.matches m ON m.id = msg.match_id
      WHERE msg.id = message_read_receipts.message_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert read receipts" ON public.message_read_receipts;
CREATE POLICY "Participants can insert read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS(
      SELECT 1 FROM public.messages msg
      JOIN public.matches m ON m.id = msg.match_id
      WHERE msg.id = message_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- 6.3 BLOCKED USERS RLS
DROP POLICY IF EXISTS "Users can view their blocks" ON public.blocked_users;
CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can create blocks" ON public.blocked_users;
CREATE POLICY "Users can create blocks"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete their blocks" ON public.blocked_users;
CREATE POLICY "Users can delete their blocks"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- 6.4 FAMILY PERMISSIONS RLS
DROP POLICY IF EXISTS "Wali can view their permissions" ON public.family_permissions;
CREATE POLICY "Wali can view their permissions"
  ON public.family_permissions FOR SELECT
  USING (auth.uid() = wali_id);

DROP POLICY IF EXISTS "Ward can view their permissions" ON public.family_permissions;
CREATE POLICY "Ward can view their permissions"
  ON public.family_permissions FOR SELECT
  USING (auth.uid() = ward_id);

DROP POLICY IF EXISTS "Ward can create permissions" ON public.family_permissions;
CREATE POLICY "Ward can create permissions"
  ON public.family_permissions FOR INSERT
  WITH CHECK (auth.uid() = ward_id);

DROP POLICY IF EXISTS "Ward can update permissions" ON public.family_permissions;
CREATE POLICY "Ward can update permissions"
  ON public.family_permissions FOR UPDATE
  USING (auth.uid() = ward_id)
  WITH CHECK (auth.uid() = ward_id);

DROP POLICY IF EXISTS "Ward can revoke permissions" ON public.family_permissions;
CREATE POLICY "Ward can revoke permissions"
  ON public.family_permissions FOR DELETE
  USING (auth.uid() = ward_id);

-- 6.5 FAMILY APPROVALS RLS
DROP POLICY IF EXISTS "Match participants can view approvals" ON public.family_approvals;
CREATE POLICY "Match participants can view approvals"
  ON public.family_approvals FOR SELECT
  USING (
    public.is_match_participant(match_id, auth.uid())
    OR auth.uid() = wali_id
  );

DROP POLICY IF EXISTS "Wali can update approval" ON public.family_approvals;
CREATE POLICY "Wali can update approval"
  ON public.family_approvals FOR UPDATE
  USING (auth.uid() = wali_id)
  WITH CHECK (auth.uid() = wali_id);

-- 6.6 MAHR CALCULATIONS RLS
DROP POLICY IF EXISTS "Match participants can view mahr" ON public.mahr_calculations;
CREATE POLICY "Match participants can view mahr"
  ON public.mahr_calculations FOR SELECT
  USING (public.is_match_participant(match_id, auth.uid()));

DROP POLICY IF EXISTS "Match participants can insert mahr" ON public.mahr_calculations;
CREATE POLICY "Match participants can insert mahr"
  ON public.mahr_calculations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_match_participant(match_id, auth.uid())
  );

DROP POLICY IF EXISTS "Match participants can update mahr" ON public.mahr_calculations;
CREATE POLICY "Match participants can update mahr"
  ON public.mahr_calculations FOR UPDATE
  USING (public.is_match_participant(match_id, auth.uid()))
  WITH CHECK (public.is_match_participant(match_id, auth.uid()));

-- Walis can view mahr for their wards' matches
DROP POLICY IF EXISTS "Wali can view ward mahr" ON public.mahr_calculations;
CREATE POLICY "Wali can view ward mahr"
  ON public.mahr_calculations FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.family_permissions fp
      JOIN public.matches m ON m.id = mahr_calculations.match_id
      WHERE fp.wali_id = auth.uid()
      AND fp.can_view_matches = TRUE
      AND (fp.ward_id = m.user1_id OR fp.ward_id = m.user2_id)
    )
  );

-- 6.7 FIRASA REPORTS RLS
DROP POLICY IF EXISTS "Requester can view own reports" ON public.firasa_reports;
CREATE POLICY "Requester can view own reports"
  ON public.firasa_reports FOR SELECT
  USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "System can insert reports" ON public.firasa_reports;
CREATE POLICY "System can insert reports"
  ON public.firasa_reports FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- 6.8 MUFTI CONVERSATIONS RLS
DROP POLICY IF EXISTS "Users can view own conversations" ON public.mufti_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.mufti_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.mufti_conversations;
CREATE POLICY "Users can create conversations"
  ON public.mufti_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.mufti_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.mufti_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.mufti_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.mufti_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 6.9 NOTIFICATIONS RLS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION 7: ENHANCED DISCOVERY WITH BLOCKING
-- ============================================================================

-- Update discovery feed to filter blocked users
CREATE OR REPLACE FUNCTION public.get_discovery_feed_v3(p_limit int default 20)
RETURNS TABLE(
  id uuid,
  full_name text,
  gender public.gender_enum,
  dob date,
  country text,
  city text,
  sect text,
  religiosity_level text,
  education_level text,
  bio text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_self public.profiles%rowtype;
  v_pref public.preferences%rowtype;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_self FROM public.profiles WHERE profiles.id = v_uid;
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_pref FROM public.preferences WHERE preferences.user_id = v_uid;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.gender,
    p.dob,
    p.country,
    p.city,
    p.sect,
    p.religiosity_level,
    p.education_level,
    p.bio
  FROM public.profiles p
  WHERE p.id <> v_uid
    AND p.is_suspended = FALSE
    -- Opposite gender only
    AND p.gender <> v_self.gender
    -- Exclude already swiped
    AND NOT EXISTS (
      SELECT 1 FROM public.swipes s
      WHERE s.actor_id = v_uid AND s.target_id = p.id
    )
    -- BLOCK FILTER: Exclude blocked users (either direction)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users bu
      WHERE (bu.blocker_id = v_uid AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = v_uid)
    )
    -- Preference filters
    AND (
      v_pref IS NULL
      OR (
        date_part('year', age(current_date, p.dob)) BETWEEN v_pref.min_age AND v_pref.max_age
        AND (v_pref.preferred_sect IS NULL OR p.sect = v_pref.preferred_sect)
        AND (v_pref.preferred_religiosity_level IS NULL OR p.religiosity_level = v_pref.preferred_religiosity_level)
      )
    )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

-- ============================================================================
-- SECTION 8: RPC FUNCTIONS
-- ============================================================================

-- 8.1 Block a user
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID, p_reason TEXT DEFAULT 'unspecified')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_uid = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  INSERT INTO public.blocked_users(blocker_id, blocked_id, reason)
  VALUES (v_uid, p_blocked_id, p_reason::public.block_reason_enum)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  -- Also deactivate any existing matches
  UPDATE public.matches
  SET is_active = FALSE, status = 'cancelled'
  WHERE ((user1_id = v_uid AND user2_id = p_blocked_id) 
      OR (user1_id = p_blocked_id AND user2_id = v_uid))
    AND is_active = TRUE;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8.2 Unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.blocked_users
  WHERE blocker_id = v_uid AND blocked_id = p_blocked_id;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8.3 Mark message as read
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user is participant
  IF NOT EXISTS(
    SELECT 1 FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.id = p_message_id
    AND (m.user1_id = v_uid OR m.user2_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Update message read_at if not sender
  UPDATE public.messages
  SET read_at = COALESCE(read_at, NOW())
  WHERE id = p_message_id
    AND sender_id <> v_uid;
  
  -- Insert read receipt
  INSERT INTO public.message_read_receipts(message_id, user_id)
  VALUES (p_message_id, v_uid)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8.4 Grant family permissions
CREATE OR REPLACE FUNCTION public.grant_family_permissions(
  p_wali_id UUID,
  p_can_view_matches BOOLEAN DEFAULT TRUE,
  p_can_approve_matches BOOLEAN DEFAULT TRUE,
  p_can_view_messages BOOLEAN DEFAULT FALSE,
  p_can_veto_matches BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_uid = p_wali_id THEN
    RAISE EXCEPTION 'Cannot grant permissions to yourself';
  END IF;
  
  INSERT INTO public.family_permissions(
    wali_id, ward_id, can_view_matches, can_approve_matches, 
    can_view_messages, can_veto_matches
  )
  VALUES (
    p_wali_id, v_uid, p_can_view_matches, p_can_approve_matches,
    p_can_view_messages, p_can_veto_matches
  )
  ON CONFLICT (wali_id, ward_id) DO UPDATE SET
    can_view_matches = EXCLUDED.can_view_matches,
    can_approve_matches = EXCLUDED.can_approve_matches,
    can_view_messages = EXCLUDED.can_view_messages,
    can_veto_matches = EXCLUDED.can_veto_matches,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8.5 Propose mahr
CREATE OR REPLACE FUNCTION public.propose_mahr(
  p_match_id UUID,
  p_immediate_amount DECIMAL,
  p_deferred_amount DECIMAL,
  p_currency TEXT DEFAULT 'USD',
  p_madhab TEXT DEFAULT NULL,
  p_gold_grams DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_mahr_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT public.is_match_participant(p_match_id, v_uid) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;
  
  INSERT INTO public.mahr_calculations(
    user_id, match_id, immediate_amount, deferred_amount, 
    currency, madhab, gold_grams_equivalent, notes,
    agreed_by_user
  )
  VALUES (
    v_uid, p_match_id, p_immediate_amount, p_deferred_amount,
    p_currency, p_madhab::public.madhab_enum, p_gold_grams, p_notes,
    TRUE -- Proposer agrees by default
  )
  ON CONFLICT (user_id, match_id) DO UPDATE SET
    immediate_amount = EXCLUDED.immediate_amount,
    deferred_amount = EXCLUDED.deferred_amount,
    currency = EXCLUDED.currency,
    madhab = EXCLUDED.madhab,
    gold_grams_equivalent = EXCLUDED.gold_grams_equivalent,
    notes = EXCLUDED.notes,
    agreed_by_user = TRUE,
    agreed_by_user_at = NOW(),
    agreed_by_match = FALSE,
    agreed_by_match_at = NULL,
    finalized_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_mahr_id;
  
  RETURN jsonb_build_object('success', TRUE, 'mahr_id', v_mahr_id);
END;
$$;

-- 8.6 Accept mahr proposal
CREATE OR REPLACE FUNCTION public.accept_mahr(p_mahr_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_mahr public.mahr_calculations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT * INTO v_mahr FROM public.mahr_calculations WHERE id = p_mahr_id;
  
  IF v_mahr IS NULL THEN
    RAISE EXCEPTION 'Mahr calculation not found';
  END IF;
  
  IF NOT public.is_match_participant(v_mahr.match_id, v_uid) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;
  
  IF v_mahr.user_id = v_uid THEN
    -- Proposer confirming
    UPDATE public.mahr_calculations
    SET agreed_by_user = TRUE, agreed_by_user_at = NOW()
    WHERE id = p_mahr_id;
  ELSE
    -- Other party accepting
    UPDATE public.mahr_calculations
    SET agreed_by_match = TRUE, agreed_by_match_at = NOW()
    WHERE id = p_mahr_id;
  END IF;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 8.7 Start mufti conversation
CREATE OR REPLACE FUNCTION public.start_mufti_conversation(
  p_topic TEXT,
  p_initial_message TEXT,
  p_match_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_conv_id UUID;
  v_messages JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_messages := jsonb_build_array(
    jsonb_build_object(
      'role', 'user',
      'content', p_initial_message,
      'timestamp', NOW()
    )
  );
  
  INSERT INTO public.mufti_conversations(user_id, topic, messages, match_id)
  VALUES (v_uid, p_topic, v_messages, p_match_id)
  RETURNING id INTO v_conv_id;
  
  RETURN jsonb_build_object('success', TRUE, 'conversation_id', v_conv_id);
END;
$$;

-- 8.8 Add message to mufti conversation
CREATE OR REPLACE FUNCTION public.add_mufti_message(
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_role NOT IN ('user', 'assistant') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  
  UPDATE public.mufti_conversations
  SET messages = messages || jsonb_build_array(
    jsonb_build_object(
      'role', p_role,
      'content', p_content,
      'timestamp', NOW()
    )
  ),
  updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = v_uid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found or not authorized';
  END IF;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ============================================================================
-- SECTION 9: GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.message_read_receipts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_permissions TO authenticated;
GRANT SELECT, UPDATE ON public.family_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mahr_calculations TO authenticated;
GRANT SELECT, INSERT ON public.firasa_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mufti_conversations TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Grant sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.message_read_receipts IS 'Phase 3: Tracks individual message read status per user';
COMMENT ON TABLE public.blocked_users IS 'Phase 3: User blocking with discovery filtering';
COMMENT ON TABLE public.family_permissions IS 'Phase 3: Granular wali oversight permissions';
COMMENT ON TABLE public.family_approvals IS 'Phase 3: Track wali decisions on specific matches';
COMMENT ON TABLE public.mahr_calculations IS 'Phase 3: Islamic dower tracking and agreement';
COMMENT ON TABLE public.firasa_reports IS 'Phase 3: AI character analysis reports';
COMMENT ON TABLE public.mufti_conversations IS 'Phase 3: AI Islamic guidance conversations';
COMMENT ON TABLE public.notifications IS 'Phase 3: In-app notification system';
