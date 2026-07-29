-- =============================================================
-- QuizVerse — Seed Data
-- Run AFTER the migration in Supabase SQL Editor
-- =============================================================

-- =============================================================
-- ACHIEVEMENTS
-- =============================================================
INSERT INTO achievements (name, description, icon, color, condition_type, condition_value, xp_reward) VALUES
  ('First Quiz',      'Completed your first quiz!',                    '🎯', '#7c6fef', 'quiz_count',  1,   50),
  ('Quiz Veteran',    'Completed 10 quizzes',                          '🏅', '#f928b8', 'quiz_count',  10,  150),
  ('Quiz Master',     'Completed 50 quizzes',                          '🏆', '#ffd700', 'quiz_count',  50,  500),
  ('Perfect Score',   'Achieved a perfect score in a quiz',            '💯', '#22c55e', 'score',       1000, 200),
  ('High Achiever',   'Scored over 800 points in a single quiz',       '⭐', '#00f0ff', 'score',       800,  100),
  ('Speed Demon',     'Answered correctly in under 5 seconds',         '⚡', '#ff6b35', 'speed',       5,   75),
  ('On a Roll',       'Got 5 correct answers in a row',                '🔥', '#ef4444', 'streak',      5,   100),
  ('Unstoppable',     'Got 10 correct answers in a row',               '🚀', '#7928ca', 'streak',      10,  250),
  ('Sharp Mind',      'Completed a quiz without any wrong answers',    '🧠', '#10b981', 'perfect',     1,   300);

-- =============================================================
-- PLATFORM SETTINGS
-- =============================================================
INSERT INTO platform_settings (key, value) VALUES
  ('platform_name',          'QuizVerse'),
  ('max_questions_per_quiz', '100'),
  ('max_options_per_question','6'),
  ('default_time_limit',     '30'),
  ('enable_registrations',   'true'),
  ('maintenance_mode',       'false');

-- =============================================================
-- SUPER ADMIN (create via Supabase Auth first, then run this)
-- Replace 'YOUR_SUPER_ADMIN_USER_ID' with actual auth.users.id
-- =============================================================
-- INSERT INTO profiles (id, email, username, display_name, role, avatar_seed, xp, level)
-- VALUES ('YOUR_SUPER_ADMIN_USER_ID', 'superadmin@quizverse.app', 'superadmin', 'Super Admin', 'super_admin', 'superadmin', 9999, 99)
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
