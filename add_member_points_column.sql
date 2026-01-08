-- Add points column to members table
-- Run this in your Supabase SQL Editor

-- First, add the column with a default value (allows NULL temporarily for existing rows)
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Update any existing NULL values to 0
UPDATE members 
SET points = 0 
WHERE points IS NULL;

-- Now make it NOT NULL (this will work since all rows now have a value)
ALTER TABLE members 
ALTER COLUMN points SET NOT NULL;

-- Set default for future inserts
ALTER TABLE members 
ALTER COLUMN points SET DEFAULT 0;

