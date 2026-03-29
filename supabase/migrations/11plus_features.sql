-- 11+ Exam Preparation Features Migration
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Student profile fields on members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS target_schools TEXT[],
  ADD COLUMN IF NOT EXISTS year_group TEXT,
  ADD COLUMN IF NOT EXISTS study_subjects TEXT[];

-- 2. Study subject field on events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS study_subject TEXT;

-- 3. Reward points field on wish_list_items table
ALTER TABLE wish_list_items
  ADD COLUMN IF NOT EXISTS reward_points INTEGER;

-- 4. Index for faster study event queries
CREATE INDEX IF NOT EXISTS idx_events_study_subject ON events(study_subject) WHERE study_subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_is_student ON members(is_student) WHERE is_student = TRUE;
