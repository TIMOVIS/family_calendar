-- Add points column to members table
-- Run this in your Supabase SQL Editor

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL;

