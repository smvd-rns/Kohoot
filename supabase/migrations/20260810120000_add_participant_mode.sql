-- =============================================================
-- Add participant_mode to quiz_sessions
-- Run in Supabase SQL Editor
-- SAFE: only adds a new column, no existing data is changed
-- All current sessions automatically get 'any' (open to everyone)
-- =============================================================

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS participant_mode TEXT NOT NULL DEFAULT 'any'
  CHECK (participant_mode IN ('any', 'registered_only'));

CREATE INDEX IF NOT EXISTS idx_sessions_participant_mode ON quiz_sessions(participant_mode);
