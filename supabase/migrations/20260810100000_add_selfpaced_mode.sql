-- =============================================================
-- Self-Paced Quiz Mode
-- Run this in Supabase SQL Editor (Database → SQL Editor)
-- =============================================================

-- 1. Add 'self_paced' to the status check constraint on quiz_sessions
ALTER TABLE quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_status_check;
ALTER TABLE quiz_sessions ADD CONSTRAINT quiz_sessions_status_check
  CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'self_paced'));

-- 2. Add mode column: 'live' | 'self_paced'
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'live'
  CHECK (mode IN ('live', 'self_paced'));

-- 3. Add deadline column for self-paced sessions
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- 4. Add student-level question progress tracking
ALTER TABLE session_participants ADD COLUMN IF NOT EXISTS student_question_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_participants ADD COLUMN IF NOT EXISTS is_finished BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Index for querying open self-paced sessions
CREATE INDEX IF NOT EXISTS idx_sessions_mode_status ON quiz_sessions(mode, status);
CREATE INDEX IF NOT EXISTS idx_sessions_deadline    ON quiz_sessions(deadline);
