-- 1. Create trigger function to recalculate participant stats on changes to participant_answers
CREATE OR REPLACE FUNCTION update_participant_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE session_participants
  SET 
    score = COALESCE((SELECT SUM(points_earned) FROM participant_answers WHERE participant_id = COALESCE(NEW.participant_id, OLD.participant_id)), 0),
    correct_answers = COALESCE((SELECT COUNT(*) FROM participant_answers WHERE participant_id = COALESCE(NEW.participant_id, OLD.participant_id) AND is_correct = TRUE), 0),
    wrong_answers = COALESCE((SELECT COUNT(*) FROM participant_answers WHERE participant_id = COALESCE(NEW.participant_id, OLD.participant_id) AND is_correct = FALSE), 0)
  WHERE id = COALESCE(NEW.participant_id, OLD.participant_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop trigger if exists and create it
DROP TRIGGER IF EXISTS trigger_update_participant_stats ON participant_answers;

CREATE TRIGGER trigger_update_participant_stats
AFTER INSERT OR UPDATE OR DELETE ON participant_answers
FOR EACH ROW
EXECUTE FUNCTION update_participant_stats();

-- 3. Redefine old RPC functions as safe no-ops to support older cached clients
CREATE OR REPLACE FUNCTION add_participant_score(participant_id_arg UUID, points_arg INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Score and counters are now automatically computed via trigger_update_participant_stats
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wrong_answers(participant_id_arg UUID)
RETURNS VOID AS $$
BEGIN
  -- Score and counters are now automatically computed via trigger_update_participant_stats
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Correct existing participant records to fix any duplicate scoring
UPDATE session_participants sp
SET 
  score = COALESCE((SELECT SUM(points_earned) FROM participant_answers WHERE participant_id = sp.id), 0),
  correct_answers = COALESCE((SELECT COUNT(*) FROM participant_answers WHERE participant_id = sp.id AND is_correct = TRUE), 0),
  wrong_answers = COALESCE((SELECT COUNT(*) FROM participant_answers WHERE participant_id = sp.id AND is_correct = FALSE), 0);
