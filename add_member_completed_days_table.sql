-- Create table to track which days members have completed (to prevent duplicate point awards)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS member_completed_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  points_awarded INTEGER DEFAULT 100 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_member_completed_days_member_date ON member_completed_days(member_id, completed_date);

