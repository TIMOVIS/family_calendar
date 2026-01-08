-- RLS Policies for Families Table
-- Run this in your Supabase SQL Editor to allow family members to read their family data (including join_code)
-- Uses security definer function to avoid infinite recursion

-- Enable RLS on families table (if not already enabled)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read their family data" ON families;

-- Create security definer function to check if user is a member of the family
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_user_family_member(family_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.family_id = family_id_param
    AND members.user_id = auth.uid()
  );
END;
$$;

-- Policy: Allow users to read their family data (including join_code)
CREATE POLICY "Users can read their family data"
ON families
FOR SELECT
USING (is_user_family_member(families.id));
