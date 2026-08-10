-- =============================================================
-- Add RLS policies for custom_field_responses
-- Run in Supabase SQL Editor
-- SAFE: enables proper security access rules for student uploads
-- =============================================================

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Students insert own custom field responses" ON custom_field_responses;
DROP POLICY IF EXISTS "Students update own custom field responses" ON custom_field_responses;
DROP POLICY IF EXISTS "Allow reading custom field responses" ON custom_field_responses;

-- 1. Insert Policy
CREATE POLICY "Students insert own custom field responses" 
  ON custom_field_responses FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants 
      WHERE id = custom_field_responses.participant_id 
      AND student_id = auth.uid()
    )
  );

-- 2. Update Policy
CREATE POLICY "Students update own custom field responses" 
  ON custom_field_responses FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM session_participants 
      WHERE id = custom_field_responses.participant_id 
      AND student_id = auth.uid()
    )
  );

-- 3. Select Policy (read)
CREATE POLICY "Allow reading custom field responses" 
  ON custom_field_responses FOR SELECT 
  USING (
    -- Either the student who submitted it
    EXISTS (
      SELECT 1 FROM session_participants 
      WHERE id = custom_field_responses.participant_id 
      AND student_id = auth.uid()
    )
    OR 
    -- Or the admin who hosts the quiz session
    EXISTS (
      SELECT 1 FROM session_participants sp 
      JOIN quiz_sessions qs ON qs.id = sp.session_id 
      WHERE sp.id = custom_field_responses.participant_id 
      AND qs.admin_id = auth.uid()
    )
  );
