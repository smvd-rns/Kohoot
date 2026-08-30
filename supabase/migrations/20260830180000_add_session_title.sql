-- Add title column to quiz_sessions table for custom session names
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS title TEXT;
