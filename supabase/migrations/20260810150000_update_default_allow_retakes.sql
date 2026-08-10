-- =============================================================
-- Update default value of allow_retakes in quizzes to FALSE
-- =============================================================

ALTER TABLE quizzes ALTER COLUMN allow_retakes SET DEFAULT FALSE;
