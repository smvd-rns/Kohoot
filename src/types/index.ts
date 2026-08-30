// =====================================================
// CORE TYPES — QuizVerse
// =====================================================

export type UserRole = 'super_admin' | 'admin' | 'student'

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multi_select'
  | 'fill_blank'
  | 'image_based'
  | 'video_based'
  | 'poll'
  | 'open_ended'

export type QuizTheme =
  | 'modern'
  | 'space'
  | 'krishna'
  | 'school'
  | 'dark'
  | 'festival'
  | 'minimal'

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'completed' | 'self_paced'
export type SessionMode = 'live' | 'self_paced'
export type SessionParticipantMode = 'any' | 'registered_only'
export type FieldType = 'text' | 'number' | 'email' | 'tel' | 'dropdown' | 'radio' | 'checkbox'

// =====================================================
// USER / PROFILE
// =====================================================
export interface Profile {
  id: string
  email: string
  username: string
  display_name: string
  role: UserRole
  avatar_seed: string
  avatar_style: string
  bio?: string
  phone?: string
  xp: number
  level: number
  is_approved: boolean
  created_at: string
  updated_at: string
  // Relations
  admin_id?: string  // for students: which admin owns them
}

// =====================================================
// QUIZ
// =====================================================
export interface Quiz {
  id: string
  admin_id: string
  title: string
  description?: string
  thumbnail_url?: string
  theme: QuizTheme
  background_image_url?: string
  background_music_url?: string
  category?: string
  is_published: boolean
  is_public: boolean
  // Settings
  time_per_question: number      // seconds
  passing_score: number          // percentage
  shuffle_questions: boolean
  shuffle_options: boolean
  show_leaderboard: boolean
  enable_music: boolean
  enable_animations: boolean
  auto_submit: boolean
  allow_retakes: boolean
  max_attempts: number
  // Stats (denormalised)
  question_count: number
  total_plays: number
  avg_score: number
  created_at: string
  updated_at: string
  // Relations
  questions?: Question[]
  custom_fields?: CustomField[]
}

// =====================================================
// QUESTION
// =====================================================
export interface Question {
  id: string
  quiz_id: string
  type: QuestionType
  text: string
  media_url?: string           // image / audio / video URL
  media_type?: 'image' | 'audio' | 'video'
  time_limit: number           // seconds, overrides quiz default
  points: number
  order_index: number
  explanation?: string
  is_required: boolean
  // For fill_blank
  blank_answer?: string
  // For open_ended
  max_answer_length?: number
  created_at: string
  custom_weighting?: boolean
  // Relations
  answer_options?: AnswerOption[]
}

// =====================================================
// ANSWER OPTION
// =====================================================
export interface AnswerOption {
  id: string
  question_id: string
  text: string
  is_correct: boolean
  order_index: number
  image_url?: string
  feedback?: string
  weight?: number
}

// =====================================================
// QUIZ SESSION
// =====================================================
export interface QuizSession {
  id: string
  quiz_id: string
  admin_id: string
  room_code: string
  status: SessionStatus
  mode: SessionMode
  participant_mode: SessionParticipantMode
  deadline?: string
  current_question_index: number
  started_at?: string
  ended_at?: string
  created_at: string
  // Relations
  quiz?: Quiz
  participants?: SessionParticipant[]
}

// =====================================================
// SESSION PARTICIPANT
// =====================================================
export interface SessionParticipant {
  id: string
  session_id: string
  student_id: string
  display_name: string
  avatar_seed: string
  score: number
  correct_answers: number
  wrong_answers: number
  streak: number
  rank?: number
  joined_at: string
  finished_at?: string
  student_question_index: number   // for self-paced: which question the student is on
  is_finished: boolean             // for self-paced: did the student complete all questions?
  // Relations
  profile?: Profile
  custom_field_responses?: CustomFieldResponse[]
}

// =====================================================
// PARTICIPANT ANSWER
// =====================================================
export interface ParticipantAnswer {
  id: string
  participant_id: string
  session_id: string
  question_id: string
  selected_option_ids: string[]
  text_answer?: string
  time_taken: number           // milliseconds
  is_correct: boolean
  points_earned: number
  answered_at: string
}

// =====================================================
// LEADERBOARD
// =====================================================
export interface LeaderboardEntry {
  id: string
  session_id: string
  participant_id: string
  display_name: string
  avatar_seed: string
  score: number
  rank: number
  correct_answers: number
  time_taken: number
  // Relations
  participant?: SessionParticipant
}

// =====================================================
// CUSTOM FIELDS
// =====================================================
export interface CustomField {
  id: string
  quiz_id: string
  label: string
  field_type: FieldType
  is_required: boolean
  placeholder?: string
  options?: string[]           // for dropdown, radio, checkbox
  allow_custom?: boolean       // allow write-in for dropdowns
  custom_label?: string        // customizable placeholder for the "other" dropdown value
  order_index: number
  created_at: string
}

export interface CustomFieldResponse {
  id: string
  participant_id: string
  field_id: string
  value: string
}

// =====================================================
// ACHIEVEMENTS
// =====================================================
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  color: string
  condition_type: 'quiz_count' | 'score' | 'streak' | 'speed' | 'perfect' | 'custom'
  condition_value: number
  xp_reward: number
}

export interface StudentAchievement {
  id: string
  student_id: string
  achievement_id: string
  earned_at: string
  achievement?: Achievement
}

// =====================================================
// ANALYTICS
// =====================================================
export interface QuizAnalytics {
  quiz_id: string
  total_sessions: number
  total_participants: number
  avg_score: number
  avg_completion_rate: number
  top_performers: LeaderboardEntry[]
  score_distribution: { range: string; count: number }[]
  daily_activity: { date: string; count: number }[]
  question_stats: QuestionStat[]
}

export interface QuestionStat {
  question_id: string
  question_text: string
  correct_rate: number
  avg_time_taken: number
  most_selected_option: string
}

export interface PlatformStats {
  total_admins: number
  total_students: number
  total_quizzes: number
  total_sessions: number
  total_participants: number
  monthly_trend: { month: string; sessions: number; participants: number }[]
}

// =====================================================
// THEMES
// =====================================================
export interface ThemeConfig {
  id: QuizTheme
  name: string
  description: string
  preview_color: string
  gradient: string
  emoji: string
}

// =====================================================
// MUSIC
// =====================================================
export interface MusicTrack {
  id: string
  name: string
  url: string
  duration: number
  is_free: boolean
}

// =====================================================
// CERTIFICATE
// =====================================================
export interface Certificate {
  id: string
  student_id: string
  session_id: string
  quiz_title: string
  score: number
  issued_at: string
  certificate_url?: string
}

// =====================================================
// FORMS / UI STATE
// =====================================================
export interface AuthFormData {
  email: string
  password: string
  username?: string
  display_name?: string
  role?: UserRole
}

export interface QuizFormData {
  title: string
  description?: string
  category?: string
  theme: QuizTheme
  time_per_question: number
  passing_score: number
  shuffle_questions: boolean
  shuffle_options: boolean
  show_leaderboard: boolean
  enable_music: boolean
  enable_animations: boolean
  auto_submit: boolean
  allow_retakes: boolean
  max_attempts: number
}

export interface QuizPlayState {
  session: QuizSession | null
  participant: SessionParticipant | null
  currentQuestion: Question | null
  currentIndex: number
  totalQuestions: number
  timeRemaining: number
  selectedOptions: string[]
  textAnswer: string
  hasAnswered: boolean
  showResult: boolean
  isCorrect: boolean | null
  pointsEarned: number
  leaderboard: LeaderboardEntry[]
  showLeaderboard: boolean
  isFinished: boolean
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}
