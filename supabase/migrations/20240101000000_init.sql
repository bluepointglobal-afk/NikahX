-- Create custom types
CREATE TYPE gender_enum AS ENUM ('male', 'female');
CREATE TYPE role_enum AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE verification_status_enum AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
-- Secure by default: RLS enabled later.
-- Constraint: 18+ strictly enforced via CHECK constraint.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT, -- Copied from auth.users for easier queries, strictly kept private via RLS
    full_name TEXT,
    gender gender_enum NOT NULL,
    dob DATE NOT NULL CHECK (dob <= (CURRENT_DATE - INTERVAL '18 years')),
    bio TEXT,
    
    -- Location & filtering
    country TEXT,
    city TEXT,
    
    -- Religious & preference fields
    sect TEXT, -- e.g. Sunni, Shia, Other
    wants_hijab BOOLEAN,
    has_children BOOLEAN,
    
    -- System status
    is_suspended BOOLEAN DEFAULT FALSE,
    verification_status verification_status_enum DEFAULT 'unverified',
    role role_enum DEFAULT 'user',
    
    -- Entitlements
    is_premium BOOLEAN DEFAULT FALSE,
    likes_remaining INT DEFAULT 10,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SWIPES / INTERACTIONS TABLE
-- Records every "like" or "pass" action.
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_interaction UNIQUE(actor_id, target_id)
);

-- MATCHES TABLE
-- Created when two users mutually like each other.
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT TRUE,
    unmatched_by UUID REFERENCES profiles(id), -- If someone unmatches
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT ensure_distinct_users CHECK (user1_id <> user2_id)
);

-- MESSAGES TABLE
-- Encrypted-at-rest potential here, but for now standard text.
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (length(content) > 0),
    
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAMILY / WALI ACCESS TABLE (Observer Pattern)
-- Allows a family member to "observe" a match conversation if enabled.
CREATE TABLE family_observers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    observer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    granted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Which user granted access
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_location ON profiles(country, city);
CREATE INDEX idx_swipes_actor ON swipes(actor_id);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_messages_match_id ON messages(match_id, created_at DESC);

-- TRIGGER: Update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
