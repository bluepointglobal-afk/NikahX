-- Create ENUMs for moderation
CREATE TYPE report_reason AS ENUM ('harassment', 'scam', 'spam', 'inappropriate_content', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE moderation_action_type AS ENUM ('warn', 'mute', 'suspend', 'ban', 'absolve');
CREATE TYPE user_moderation_status AS ENUM ('active', 'suspended', 'banned');

-- Alter PROFILES to include moderation status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS moderation_status user_moderation_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ;

-- Create REPORTS table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) NOT NULL,
    target_id UUID REFERENCES auth.users(id) NOT NULL,
    reason report_reason NOT NULL,
    description TEXT,
    evidence JSONB DEFAULT '[]'::JSONB,
    status report_status DEFAULT 'pending',
    assigned_to UUID REFERENCES auth.users(id), -- Admin ID
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create MODERATION_LOGS table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id), -- Can be null if system action
    target_id UUID REFERENCES auth.users(id) NOT NULL,
    action_type moderation_action_type NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB, -- Details like duration, reason
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reporter can see their own reports
CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Admins/Service Role can see all reports (Note: Assuming an 'admin' role or similar mechanism exists, 
-- but for now leaving broad SELECT for service_role and relying on application logic for admin checks or future Admin RLS)
-- Ideally: CREATE POLICY "Admins can view all" ... using (app_admin.is_admin())

-- TRIGGER: Check Message Content
CREATE OR REPLACE FUNCTION public.check_message_content()
RETURNS TRIGGER AS $$
DECLARE
    sender_status user_moderation_status;
BEGIN
    -- 1. Check if sender is banned/suspended
    SELECT moderation_status INTO sender_status
    FROM public.profiles
    WHERE id = auth.uid();

    IF sender_status = 'banned' THEN
        RAISE EXCEPTION 'User is banned and cannot send messages.';
    END IF;

    IF sender_status = 'suspended' THEN
         RAISE EXCEPTION 'User is temporarily suspended.';
    END IF;

    -- 2. Anti-Scam Keyword Check (Basic Regex)
    -- Matches: "western union", "wire transfer", "crypto", "usdt", "bank account", "send money"
    -- Case insensitive
    IF NEW.content ~* '(western union|wire transfer|usdt|bitcoin|bank account|send money|iban|routing number)' THEN
        -- Log this attempt? For now, just block.
        RAISE EXCEPTION 'Message blocked due to safety policies (Anti-Scam).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to MESSAGES table
-- Note: Assuming table 'messages' exists from other missions.
-- We use a DO block to safely attach if table exists, or log warning.

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        DROP TRIGGER IF EXISTS tr_check_message_safety ON public.messages;
        CREATE TRIGGER tr_check_message_safety
        BEFORE INSERT ON public.messages
        FOR EACH ROW EXECUTE FUNCTION public.check_message_content();
    END IF;
END $$;
