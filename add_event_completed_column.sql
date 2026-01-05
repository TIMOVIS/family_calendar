-- Add is_completed column to events table
-- Run this in your Supabase SQL Editor

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false NOT NULL;

