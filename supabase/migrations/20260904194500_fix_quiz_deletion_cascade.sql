-- Fix foreign key constraints on quiz_sessions and session_participants for current_quiz_id to allow quiz deletion
ALTER TABLE quiz_sessions
  DROP CONSTRAINT IF EXISTS quiz_sessions_current_quiz_id_fkey,
  ADD CONSTRAINT quiz_sessions_current_quiz_id_fkey
    FOREIGN KEY (current_quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

ALTER TABLE session_participants
  DROP CONSTRAINT IF EXISTS session_participants_current_quiz_id_fkey,
  ADD CONSTRAINT session_participants_current_quiz_id_fkey
    FOREIGN KEY (current_quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL;
