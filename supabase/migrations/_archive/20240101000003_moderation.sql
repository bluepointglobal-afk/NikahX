-- REPORTS TABLE
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reporters can create reports
CREATE POLICY "Users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Only admins/mods can view reports (via Service Role usually, or strict policies)
-- For now, we leave it private to reporter, or expose via admin dashboard logic.

-- ANTI-SCAM TRIGGER FUNCTION
-- Scans messages for banned keywords (e.g. money requests).
CREATE OR REPLACE FUNCTION check_message_content_safety()
RETURNS TRIGGER AS $$
DECLARE
    banned_patterns TEXT[] := ARRAY['send money', 'wire transfer', 'crypto', 'bank account', 'paypal'];
    pattern TEXT;
BEGIN
    FOREACH pattern IN ARRAY banned_patterns
    LOOP
        IF NEW.content ILIKE '%' || pattern || '%' THEN
            RAISE EXCEPTION 'Message content flagged for safety violations (Anti-Scam).';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scan_new_messages
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE PROCEDURE check_message_content_safety();


-- RPC: REPORT USER
CREATE OR REPLACE FUNCTION report_user(target_id UUID, reason TEXT, details TEXT DEFAULT '')
RETURNS VOID AS $$
BEGIN
    INSERT INTO reports (reporter_id, target_id, reason, details)
    VALUES (auth.uid(), target_id, reason, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: SUSPEND USER (Admin Only)
-- In real app, check for admin claim. Here we just assume service-role usage or authorized caller.
CREATE OR REPLACE FUNCTION admin_suspend_user(target_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Check if caller is admin (omitted for brevity, assume admin client call)
    UPDATE profiles SET is_suspended = TRUE WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
