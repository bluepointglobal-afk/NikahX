-- 0002_rls.sql
-- RLS Policies and Security Hardening

-- Enable RLS on core tables
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
-- Assuming wali_access exists or enabling it if it does
ALTER TABLE IF EXISTS wali_access ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------
-- Helper Functions
-- -------------------------------------------------------------------------

-- Check if the current user is the user_id provided
CREATE OR REPLACE FUNCTION is_self(user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT auth.uid() = user_id;
$$;

-- Check if the current user is valid (not banned, not deleted)
CREATE OR REPLACE FUNCTION user_is_active()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_user
    WHERE id = auth.uid()
      AND banned_at IS NULL
      AND deletion_requested_at IS NULL
  );
END;
$$;

-- Check if the current user is a participant in the given match
CREATE OR REPLACE FUNCTION is_match_participant(match_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id
      AND (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  );
END;
$$;

-- Check if two users are matched (Generic helper)
CREATE OR REPLACE FUNCTION are_matched(user_a uuid, user_b uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM matches
    WHERE (user_id_1 = user_a AND user_id_2 = user_b)
       OR (user_id_1 = user_b AND user_id_2 = user_a)
  );
END;
$$;


-- -------------------------------------------------------------------------
-- Policies: app_user
-- -------------------------------------------------------------------------

-- Default Deny implied by enabling RLS.
-- Users can read their own rows only.
CREATE POLICY "Users can view own profile"
  ON app_user
  FOR SELECT
  USING (is_self(id));

-- Users can update their own rows only.
CREATE POLICY "Users can update own profile"
  ON app_user
  FOR UPDATE
  USING (is_self(id));


-- -------------------------------------------------------------------------
-- Policies: matches
-- -------------------------------------------------------------------------

-- Participants can read match rows
CREATE POLICY "Participants can view matches"
  ON matches
  FOR SELECT
  USING (
    auth.uid() = user_id_1 OR auth.uid() = user_id_2
  );

-- No INSERT/UPDATE policies defined in prompt for matches by users (usually system or specific action).
-- If users initiate matches, we'd need an INSERT policy, but "Users can read/write their own rows only" suggests restriction.
-- I'll leave INSERT blocked for now unless "create new likes" implies access to 'likes' table, not 'matches'.


-- -------------------------------------------------------------------------
-- Policies: messages
-- -------------------------------------------------------------------------

-- SELECT: Allowed to participants AND wali users (with active access)
CREATE POLICY "Participants and Walis can view messages"
  ON messages
  FOR SELECT
  USING (
    is_match_participant(match_id)
    OR
    EXISTS (
      SELECT 1 FROM wali_access
      WHERE wali_access.match_id = messages.match_id
        AND wali_access.wali_id = auth.uid()
        AND wali_access.revoked_at IS NULL
    )
  );

-- INSERT: Only match participants can insert, AND must be active.
CREATE POLICY "Participants can insert messages if active"
  ON messages
  FOR INSERT
  WITH CHECK (
    is_match_participant(match_id)
    AND user_is_active()
    AND auth.uid() = sender_id -- Ensure they aren't spoofing sender
  );


-- -------------------------------------------------------------------------
-- Policies: photos
-- -------------------------------------------------------------------------

-- "Photos are never directly readable by others"
-- Owner can see their own photos? "Users can read/write their own rows only".
-- I will allow owner to see, but DENY everyone else.
CREATE POLICY "Users can view own photos"
  ON photos
  FOR SELECT
  USING (is_self(user_id));

-- No other SELECT policy.
-- Secure RPC/View will be needed to bypass RLS (using SECURITY DEFINER functions) to serve blurred/processed URLs.


-- -------------------------------------------------------------------------
-- Ban/Deletion Enforcement (Additional)
-- -------------------------------------------------------------------------

-- Requirement: "banned or deletion_requested_at users cannot message or create new likes."
-- Message restriction handles this via `user_is_active()` in the INSERT policy.
-- If there is a 'likes' table, we would add similar logic.
-- Assuming 'likes' table exists (common in matching apps):
ALTER TABLE IF EXISTS likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can create likes"
  ON likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND user_is_active()
  );

CREATE POLICY "Users can view own likes"
  ON likes
  FOR SELECT
  USING (auth.uid() = from_user_id);

