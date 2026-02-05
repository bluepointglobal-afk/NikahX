-- DETERMINISTIC COMPATIBILITY SCORE
-- Calculates a 0-100 score based on profile attributes.
-- Heuristic:
-- 1. Location Match (City): +40 points
-- 2. Location Match (Country): +20 points (if not city match)
-- 3. Sect Match: +30 points
-- 4. Hijab Preference (If male wants hijab and female usually wears, or doesn't matter): +10 points (Simplified for now as direct boolean match)
-- 5. Children Preference (If both have children or don't): +20 points
CREATE OR REPLACE FUNCTION calculate_compatibility_score(user_a_id UUID, user_b_id UUID)
RETURNS INT AS $$
DECLARE
    score INT := 0;
    a profiles%ROWTYPE;
    b profiles%ROWTYPE;
BEGIN
    SELECT * INTO a FROM profiles WHERE id = user_a_id;
    SELECT * INTO b FROM profiles WHERE id = user_b_id;

    IF a IS NULL OR b IS NULL THEN
        RETURN 0;
    END IF;

    -- Location
    IF a.city = b.city THEN
        score := score + 40;
    ELSIF a.country = b.country THEN
        score := score + 20;
    END IF;

    -- Sect
    IF a.sect = b.sect THEN
        score := score + 30;
    END IF;

    -- Children (Simple similarity boost)
    IF a.has_children = b.has_children THEN
        score := score + 20;
    END IF;
    
    -- Cap at 100
    IF score > 100 THEN
        score := 100;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- CREATE INTERACTION (SWIPE)
-- Transactional RPC: Records swipe, checks usage limits, creates match if mutual.
CREATE OR REPLACE FUNCTION create_interaction(target_user_id UUID, interaction_type TEXT)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID := auth.uid();
    existing_reverse_swipe swipes%ROWTYPE;
    new_match_id UUID;
    is_match BOOLEAN := FALSE;
    daily_likes INT;
    user_entitlement INT;
BEGIN
    -- 1. Check constraints (Prevent self-swipe)
    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot swipe yourself';
    END IF;

    -- 2. Check Likes Limit (if 'like')
    -- (Simplified enforcement: Check today's likes count vs entitlement)
    IF interaction_type = 'like' THEN
        SELECT likes_remaining INTO user_entitlement FROM profiles WHERE id = current_user_id;
        
        -- In a real app, we'd reset likes_remaining daily via cron or check a separate 'daily_usage' table.
        -- Here we assume 'likes_remaining' is a decrementing counter top-up model for simplicity.
        IF user_entitlement <= 0 THEN
             RAISE EXCEPTION 'No likes remaining';
        END IF;

        -- Decrement
        UPDATE profiles SET likes_remaining = likes_remaining - 1 WHERE id = current_user_id;
    END IF;

    -- 3. Insert Swipe
    INSERT INTO swipes (actor_id, target_id, action)
    VALUES (current_user_id, target_user_id, interaction_type)
    ON CONFLICT (actor_id, target_id) DO NOTHING; -- Idempotent

    -- 4. Check for Mutual Match
    IF interaction_type = 'like' THEN
        SELECT * INTO existing_reverse_swipe 
        FROM swipes 
        WHERE actor_id = target_user_id 
          AND target_id = current_user_id 
          AND action = 'like';

        IF existing_reverse_swipe IS NOT NULL THEN
            -- IT'S A MATCH!
            is_match := TRUE;
            
            INSERT INTO matches (user1_id, user2_id)
            VALUES (current_user_id, target_user_id)
            RETURNING id INTO new_match_id;

            -- System Message Bootstrap
            INSERT INTO messages (match_id, sender_id, content) 
            VALUES (new_match_id, current_user_id, 'Allows conversation to start. Say Salam!'); 
            -- Note: In a real system, 'sender_id' might be a system bot or handled differently.
            -- Here we just bootstrap with a placeholder or let the client handle the "You Matched" UI.
            -- Strictly, let's delete that message and just return the ID, 
            -- let the first user actually type.
            DELETE FROM messages WHERE match_id = new_match_id; 
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'is_match', is_match,
        'match_id', new_match_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
