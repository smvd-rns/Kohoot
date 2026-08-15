-- Drop existing select policy
DROP POLICY IF EXISTS "Allow reading custom field responses" ON custom_field_responses;

-- Create updated select policy that includes both admin and super_admin role checks
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
    -- Or any user with the role of admin or super_admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
