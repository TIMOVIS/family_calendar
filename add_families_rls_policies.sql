-- RLS Policies for Families Table
-- Run this in your Supabase SQL Editor to allow family members to read their family data (including join_code)

-- Enable RLS on families table (if not already enabled)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their family data (including join_code)
CREATE POLICY "Users can read their family data"
ON families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.family_id = families.id
    AND members.user_id = auth.uid()
  )
);

-- Note: If you already have a policy that conflicts, you may need to drop it first:
-- DROP POLICY IF EXISTS "Users can read their family data" ON families;
