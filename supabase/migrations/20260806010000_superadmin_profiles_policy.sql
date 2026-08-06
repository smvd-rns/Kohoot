-- Add policy to allow superadmins to update other user profiles
DROP POLICY IF EXISTS "Superadmins update all profiles" ON profiles;

CREATE POLICY "Superadmins update all profiles" ON profiles FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
