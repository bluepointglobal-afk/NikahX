-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_observers ENABLE ROW LEVEL SECURITY;

-- === PROFILES ===
-- Users can read their own profile.
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- "GENDER SEPARATION" READING RULE
-- Men can only see women, Women can only see men.
-- Excludes suspended users.
CREATE POLICY "Users can see opposite gender profiles"
    ON profiles FOR SELECT
    USING (
        auth.uid() <> id -- Not self (handled above)
        AND is_suspended = FALSE
        AND gender != (SELECT gender FROM profiles WHERE id = auth.uid())
    );

-- === SWIPES ===
-- Users can insert their own swipes.
CREATE POLICY "Users can create swipes"
    ON swipes FOR INSERT
    WITH CHECK (auth.uid() = actor_id);

-- Users can see their own swipes (history).
CREATE POLICY "Users can view own swipes"
    ON swipes FOR SELECT
    USING (auth.uid() = actor_id);

-- === MATCHES ===
-- Users can see matches they are part of.
CREATE POLICY "Users can view their matches"
    ON matches FOR SELECT
    USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

-- === MESSAGES ===
-- Users can read messages in their matches.
CREATE POLICY "Users can read messages in their matches"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = messages.match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        )
    );

-- Users can send messages to their matches.
CREATE POLICY "Users can send messages to their matches"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
            AND m.is_active = TRUE
        )
    );

-- === FAMILY OBSERVERS ===
-- Observers can read messages for matches they monitor.
CREATE POLICY "Family can read monitored messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM family_observers fo
            WHERE fo.match_id = messages.match_id
            AND fo.observer_id = auth.uid()
        )
    );
