-- FIX: RLS Infinite Recursion - Use SECURITY DEFINER function
-- The subquery approach still causes recursion because Postgres applies RLS to subqueries
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Create function to get current user's gender (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_gender()
RETURNS gender_enum
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT gender FROM profiles WHERE id = auth.uid();
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can see opposite gender profiles" ON profiles;

-- Recreate policy using SECURITY DEFINER function
CREATE POLICY "Users can see opposite gender profiles"
    ON profiles FOR SELECT
    USING (
        auth.uid() <> id
        AND is_suspended = FALSE
        AND gender != get_current_user_gender()
    );
