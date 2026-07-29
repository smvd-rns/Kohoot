SET search_path TO kohoot, public, auth;

DROP POLICY IF EXISTS "Questions readable by session participants" ON questions;
CREATE POLICY "Questions readable by session participants" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND (quizzes.admin_id = auth.uid() OR quizzes.is_published))
  OR EXISTS (
    SELECT 1 FROM quiz_sessions qs 
    JOIN session_participants sp ON qs.id = sp.session_id 
    WHERE qs.quiz_id = questions.quiz_id AND sp.student_id = auth.uid()
  )
);
