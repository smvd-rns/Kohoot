-- Add columns to quiz_sessions for multi-quiz sessions
ALTER TABLE quiz_sessions ADD COLUMN quiz_ids UUID[];
ALTER TABLE quiz_sessions ADD COLUMN current_quiz_id UUID REFERENCES quizzes(id);
ALTER TABLE quiz_sessions ADD COLUMN transition_messages TEXT[];

-- Migrate existing single quiz sessions to populate these fields
UPDATE quiz_sessions SET quiz_ids = ARRAY[quiz_id], current_quiz_id = quiz_id;
