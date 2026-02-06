-- FIX: RLS Infinite Recursion on Profiles Table
-- Issue: The gender-based profile policy causes recursion when checking gender in subquery
-- Solution: Add is_suspended check to prevent infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read opposite gender profiles" ON profiles;
DROP POLICY IF EXISTS "Users can see opposite gender profiles" ON profiles;

-- Recreate with is_suspended check in subquery
CREATE POLICY "Users can see opposite gender profiles"
    ON profiles FOR SELECT
    USING (
        auth.uid() <> id
        AND is_suspended = FALSE
        AND gender != (
            SELECT gender FROM profiles 
            WHERE id = auth.uid() 
            AND is_suspended = FALSE
        )
    );
