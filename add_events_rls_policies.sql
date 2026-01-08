-- RLS Policies for Events Table
-- Run this in your Supabase SQL Editor to allow event updates
-- This ensures users can update events they created or are attendees of
-- Uses security definer functions to avoid infinite recursion

-- Enable RLS on events table (if not already enabled)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update events they created" ON events;
DROP POLICY IF EXISTS "Users can update events they attend" ON events;
DROP POLICY IF EXISTS "Admins can update any event in their family" ON events;

-- Create security definer function to check if user is a member
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_user_member(member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.id = member_id
    AND members.user_id = auth.uid()
  );
END;
$$;

-- Create security definer function to check if user is admin in family
CREATE OR REPLACE FUNCTION is_user_admin_in_family(family_id_param UUID)
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
    AND members.role = 'admin'
  );
END;
$$;

-- Create security definer function to check if user is attendee
CREATE OR REPLACE FUNCTION is_user_attendee(event_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_attendees
    JOIN members ON members.id = event_attendees.member_id
    WHERE event_attendees.event_id = event_id_param
    AND members.user_id = auth.uid()
  );
END;
$$;

-- Policy: Allow users to update events they created
CREATE POLICY "Users can update events they created"
ON events
FOR UPDATE
USING (is_user_member(events.created_by));

-- Policy: Allow users to update events they are attendees of
CREATE POLICY "Users can update events they attend"
ON events
FOR UPDATE
USING (is_user_attendee(events.id));

-- Policy: Allow admins to update any event in their family
CREATE POLICY "Admins can update any event in their family"
ON events
FOR UPDATE
USING (is_user_admin_in_family(events.family_id));
