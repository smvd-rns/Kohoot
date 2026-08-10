-- Update add_xp to automatically calculate and update level based on total XP
CREATE OR REPLACE FUNCTION add_xp(user_id_arg UUID, xp_arg INTEGER)
RETURNS VOID AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER := 1;
  temp_xp INTEGER;
  needed INTEGER;
BEGIN
  -- Update XP
  UPDATE profiles SET xp = xp + xp_arg, updated_at = NOW() WHERE id = user_id_arg
  RETURNING xp INTO new_xp;

  -- Calculate level from new_xp using: Math.round(level * 100 * (1 + level * 0.1))
  temp_xp := new_xp;
  LOOP
    needed := ROUND(new_level * 100 * (1 + new_level * 0.1))::INTEGER;
    EXIT WHEN temp_xp < needed;
    temp_xp := temp_xp - needed;
    new_level := new_level + 1;
  END LOOP;

  -- Update level
  UPDATE profiles SET level = new_level WHERE id = user_id_arg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
