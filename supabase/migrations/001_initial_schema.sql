-- =============================================================
-- QuizVerse — Database Schema v1.0
-- Run this in Supabase SQL Editor (Database → SQL Editor)
-- =============================================================

SET search_path TO kohoot, public, auth;


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- PROFILES
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  username       TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin','admin','student')),
  avatar_seed    TEXT NOT NULL DEFAULT 'default',
  avatar_style   TEXT NOT NULL DEFAULT 'adventurer',
  bio            TEXT,
  xp             INTEGER NOT NULL DEFAULT 0,
  level          INTEGER NOT NULL DEFAULT 1,
  admin_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- QUIZZES
-- =============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT,
  thumbnail_url           TEXT,
  theme                   TEXT NOT NULL DEFAULT 'modern',
  background_image_url    TEXT,
  background_music_url    TEXT,
  category                TEXT,
  is_published            BOOLEAN NOT NULL DEFAULT FALSE,
  is_public               BOOLEAN NOT NULL DEFAULT FALSE,
  -- Settings
  time_per_question       INTEGER NOT NULL DEFAULT 30,
  passing_score           INTEGER NOT NULL DEFAULT 60,
  shuffle_questions       BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_options         BOOLEAN NOT NULL DEFAULT FALSE,
  show_leaderboard        BOOLEAN NOT NULL DEFAULT TRUE,
  enable_music            BOOLEAN NOT NULL DEFAULT FALSE,
  enable_animations       BOOLEAN NOT NULL DEFAULT TRUE,
  auto_submit             BOOLEAN NOT NULL DEFAULT TRUE,
  allow_retakes           BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts            INTEGER NOT NULL DEFAULT 3,
  -- Stats
  question_count          INTEGER NOT NULL DEFAULT 0,
  total_plays             INTEGER NOT NULL DEFAULT 0,
  avg_score               NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- QUESTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type             TEXT NOT NULL DEFAULT 'multiple_choice'
                   CHECK (type IN ('multiple_choice','true_false','multi_select','fill_blank','image_based','audio_based','video_based','poll','puzzle','open_ended')),
  text             TEXT NOT NULL DEFAULT '',
  media_url        TEXT,
  media_type       TEXT CHECK (media_type IN ('image','audio','video')),
  time_limit       INTEGER NOT NULL DEFAULT 30,
  points           INTEGER NOT NULL DEFAULT 100,
  order_index      INTEGER NOT NULL DEFAULT 0,
  explanation      TEXT,
  is_required      BOOLEAN NOT NULL DEFAULT TRUE,
  puzzle_items     TEXT[],
  blank_answer     TEXT,
  max_answer_length INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- ANSWER OPTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS answer_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL DEFAULT '',
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  feedback    TEXT
);

-- =============================================================
-- QUIZ SESSIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id                 UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  admin_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_code               TEXT NOT NULL UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting','active','paused','completed')),
  current_question_index  INTEGER NOT NULL DEFAULT 0,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON quiz_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status    ON quiz_sessions(status);

-- =============================================================
-- SESSION PARTICIPANTS
-- =============================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  avatar_seed     TEXT NOT NULL DEFAULT 'default',
  score           INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers   INTEGER NOT NULL DEFAULT 0,
  streak          INTEGER NOT NULL DEFAULT 0,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_session   ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_student   ON session_participants(student_id);

-- =============================================================
-- PARTICIPANT ANSWERS
-- =============================================================
CREATE TABLE IF NOT EXISTS participant_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  session_id          UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  text_answer         TEXT,
  time_taken          INTEGER NOT NULL DEFAULT 0,
  is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned       INTEGER NOT NULL DEFAULT 0,
  answered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, question_id)
);

-- =============================================================
-- CUSTOM FIELDS
-- =============================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text'
              CHECK (field_type IN ('text','number','email','tel','dropdown','radio','checkbox')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  placeholder TEXT,
  options     TEXT[],
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- CUSTOM FIELD RESPONSES
-- =============================================================
CREATE TABLE IF NOT EXISTS custom_field_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  field_id       UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value          TEXT NOT NULL DEFAULT '',
  UNIQUE(participant_id, field_id)
);

-- =============================================================
-- ACHIEVEMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL DEFAULT '🏆',
  color            TEXT NOT NULL DEFAULT '#7c6fef',
  condition_type   TEXT NOT NULL DEFAULT 'quiz_count'
                   CHECK (condition_type IN ('quiz_count','score','streak','speed','perfect','custom')),
  condition_value  INTEGER NOT NULL DEFAULT 1,
  xp_reward        INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS student_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- =============================================================
-- CERTIFICATES
-- =============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  quiz_title      TEXT NOT NULL,
  score           INTEGER NOT NULL DEFAULT 0,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_url TEXT,
  UNIQUE(student_id, session_id)
);

-- =============================================================
-- PLATFORM SETTINGS
-- =============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- RPC FUNCTIONS
-- =============================================================

-- Increment question count
CREATE OR REPLACE FUNCTION increment_question_count(quiz_id_arg UUID)
RETURNS VOID AS $$
  UPDATE quizzes SET question_count = question_count + 1, updated_at = NOW() WHERE id = quiz_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Decrement question count
CREATE OR REPLACE FUNCTION decrement_question_count(quiz_id_arg UUID)
RETURNS VOID AS $$
  UPDATE quizzes SET question_count = GREATEST(0, question_count - 1), updated_at = NOW() WHERE id = quiz_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add participant score
CREATE OR REPLACE FUNCTION add_participant_score(participant_id_arg UUID, points_arg INTEGER)
RETURNS VOID AS $$
  UPDATE session_participants
  SET score = score + points_arg, correct_answers = correct_answers + 1, streak = streak + 1
  WHERE id = participant_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Increment wrong answers
CREATE OR REPLACE FUNCTION increment_wrong_answers(participant_id_arg UUID)
RETURNS VOID AS $$
  UPDATE session_participants
  SET wrong_answers = wrong_answers + 1, streak = 0
  WHERE id = participant_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add XP to profile
CREATE OR REPLACE FUNCTION add_xp(user_id_arg UUID, xp_arg INTEGER)
RETURNS VOID AS $$
  UPDATE profiles SET xp = xp + xp_arg, updated_at = NOW() WHERE id = user_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_answers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields        ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings    ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- QUIZZES policies
CREATE POLICY "Admins manage own quizzes" ON quizzes FOR ALL USING (
  auth.uid() = admin_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Public read published quizzes" ON quizzes FOR SELECT USING (is_published = TRUE OR auth.uid() = admin_id);

-- QUESTIONS policies
CREATE POLICY "Questions readable by session participants" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND (quizzes.admin_id = auth.uid() OR quizzes.is_published))
);
CREATE POLICY "Admins manage questions" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.admin_id = auth.uid())
);

-- ANSWER OPTIONS policies
CREATE POLICY "Options readable" ON answer_options FOR SELECT USING (true);
CREATE POLICY "Admins manage options" ON answer_options FOR ALL USING (
  EXISTS (SELECT 1 FROM questions q JOIN quizzes qz ON qz.id = q.quiz_id WHERE q.id = answer_options.question_id AND qz.admin_id = auth.uid())
);

-- SESSIONS policies
CREATE POLICY "Sessions readable" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Admins manage sessions" ON quiz_sessions FOR ALL USING (
  auth.uid() = admin_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- PARTICIPANTS policies
CREATE POLICY "Participants readable in session" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Students join sessions" ON session_participants FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "System updates participants" ON session_participants FOR UPDATE USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM quiz_sessions qs WHERE qs.id = session_participants.session_id AND qs.admin_id = auth.uid()));

-- PARTICIPANT ANSWERS policies
CREATE POLICY "Students manage own answers" ON participant_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM session_participants sp WHERE sp.id = participant_answers.participant_id AND sp.student_id = auth.uid())
  OR EXISTS (SELECT 1 FROM quiz_sessions qs WHERE qs.id = participant_answers.session_id AND qs.admin_id = auth.uid())
);

-- CUSTOM FIELDS policies
CREATE POLICY "Custom fields readable" ON custom_fields FOR SELECT USING (true);
CREATE POLICY "Admins manage custom fields" ON custom_fields FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = custom_fields.quiz_id AND quizzes.admin_id = auth.uid())
);

-- ACHIEVEMENTS policies
CREATE POLICY "Achievements readable" ON achievements FOR SELECT USING (true);
CREATE POLICY "Super admin manages achievements" ON achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- STUDENT ACHIEVEMENTS policies
CREATE POLICY "Student achievements readable" ON student_achievements FOR SELECT USING (true);
CREATE POLICY "System inserts achievements" ON student_achievements FOR INSERT WITH CHECK (auth.uid() = student_id);

-- CERTIFICATES policies
CREATE POLICY "Students read own certificates" ON certificates FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "System issues certificates" ON certificates FOR INSERT WITH CHECK (true);

-- PLATFORM SETTINGS policies
CREATE POLICY "Platform settings readable" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "Super admin manages settings" ON platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Enable realtime for live quiz features
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE participant_answers;
