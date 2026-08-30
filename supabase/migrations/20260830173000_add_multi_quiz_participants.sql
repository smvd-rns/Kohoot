-- Add current_quiz_id to session_participants for tracking self-paced multi-quiz progress
ALTER TABLE session_participants ADD COLUMN current_quiz_id UUID REFERENCES quizzes(id);

-- Backfill existing participants to point to their session's quiz_id
UPDATE session_participants sp
SET current_quiz_id = (SELECT quiz_id FROM quiz_sessions WHERE id = sp.session_id);
