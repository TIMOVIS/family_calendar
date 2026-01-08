-- RLS Policies for Events Table
-- Run this in your Supabase SQL Editor to allow event updates
-- This ensures users can update events they created or are attendees of

-- Enable RLS on events table (if not already enabled)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to update events they created
CREATE POLICY "Users can update events they created"
ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = events.created_by
    AND members.user_id = auth.uid()
  )
);

-- Policy: Allow users to update events they are attendees of
CREATE POLICY "Users can update events they attend"
ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM event_attendees
    JOIN members ON members.id = event_attendees.member_id
    WHERE event_attendees.event_id = events.id
    AND members.user_id = auth.uid()
  )
);

-- Policy: Allow admins to update any event in their family
CREATE POLICY "Admins can update any event in their family"
ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.family_id = events.family_id
    AND members.user_id = auth.uid()
    AND members.role = 'admin'
  )
);

-- Note: If you already have policies that conflict, you may need to drop them first:
-- DROP POLICY IF EXISTS "Users can update events they created" ON events;
-- DROP POLICY IF EXISTS "Users can update events they attend" ON events;
-- DROP POLICY IF EXISTS "Admins can update any event in their family" ON events;
