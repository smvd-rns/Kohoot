import { supabase } from '@/lib/supabase'
import type { Quiz, QuizFormData, Question, AnswerOption, CustomField } from '@/types'
import { generateRoomCode } from '@/lib/utils'

export const quizService = {
  // ── Quizzes ─────────────────────────────────────────────────────────────────
  async listQuizzes(adminId: string, role?: string): Promise<Quiz[]> {
    let query = supabase
      .from('quizzes')
      .select('*, questions(count)')
      .order('created_at', { ascending: false })
      
    if (role !== 'super_admin') {
      query = query.eq('admin_id', adminId)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async getQuiz(id: string): Promise<Quiz> {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions(
          *,
          answer_options(*)
        ),
        custom_fields(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createQuiz(adminId: string, formData: QuizFormData): Promise<Quiz> {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        admin_id: adminId,
        ...formData,
        is_published: false,
        question_count: 0,
        total_plays: 0,
        avg_score: 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz> {
    const { data, error } = await supabase
      .from('quizzes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteQuiz(id: string): Promise<void> {
    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (error) throw error
  },

  async duplicateQuiz(quizId: string, adminId: string): Promise<Quiz> {
    const original = await this.getQuiz(quizId)
    const { questions, custom_fields, ...quizData } = original

    // Create duplicate
    const { data: newQuiz, error } = await supabase
      .from('quizzes')
      .insert({ ...quizData, id: undefined, title: `${quizData.title} (Copy)`, is_published: false, admin_id: adminId, created_at: undefined, updated_at: undefined })
      .select()
      .single()
    if (error) throw error

    // Duplicate questions and options
    if (questions) {
      for (const q of questions) {
        const { answer_options, ...qData } = q
        const { data: newQ } = await supabase
          .from('questions')
          .insert({ ...qData, id: undefined, quiz_id: newQuiz.id, created_at: undefined })
          .select()
          .single()
        if (newQ && answer_options) {
          await supabase.from('answer_options').insert(
            answer_options.map(o => ({ ...o, id: undefined, question_id: newQ.id }))
          )
        }
      }
    }
    return newQuiz
  },

  async publishQuiz(id: string, publish: boolean): Promise<void> {
    await supabase.from('quizzes').update({ is_published: publish }).eq('id', id)
  },

  // ── Questions ────────────────────────────────────────────────────────────────
  async getQuestions(quizId: string): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, answer_options(*)')
      .eq('quiz_id', quizId)
      .order('order_index')
    if (error) throw error
    return data ?? []
  },

  async createQuestion(quizId: string, question: Partial<Question>): Promise<Question> {
    const { data: maxOrder } = await supabase
      .from('questions')
      .select('order_index')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('questions')
      .insert({ ...question, quiz_id: quizId, order_index: (maxOrder?.order_index ?? -1) + 1, points: question.points ?? 100 })
      .select('*, answer_options(*)')
      .single()
    if (error) throw error

    // Update question count
    await supabase.rpc('increment_question_count', { quiz_id_arg: quizId })
    return data
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select('*, answer_options(*)')
      .single()
    if (error) throw error
    return data
  },

  async deleteQuestion(id: string, quizId: string): Promise<void> {
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
    await supabase.rpc('decrement_question_count', { quiz_id_arg: quizId })
  },

  async reorderQuestions(questions: { id: string; order_index: number }[]): Promise<void> {
    const updates = questions.map(q =>
      supabase.from('questions').update({ order_index: q.order_index }).eq('id', q.id)
    )
    await Promise.all(updates)
  },

  // ── Answer Options ────────────────────────────────────────────────────────────
  async upsertOptions(questionId: string, options: Partial<AnswerOption>[]): Promise<AnswerOption[]> {
    // Delete existing
    await supabase.from('answer_options').delete().eq('question_id', questionId)
    // Insert new
    const { data, error } = await supabase
      .from('answer_options')
      .insert(options.map((o, i) => ({ ...o, question_id: questionId, order_index: i })))
      .select()
    if (error) throw error
    return data ?? []
  },

  // ── Custom Fields ─────────────────────────────────────────────────────────────
  async getCustomFields(quizId: string): Promise<CustomField[]> {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index')
    if (error) throw error
    return data ?? []
  },

  async upsertCustomFields(quizId: string, fields: Partial<CustomField>[]): Promise<CustomField[]> {
    const { error: delError } = await supabase.from('custom_fields').delete().eq('quiz_id', quizId)
    if (delError) throw delError
    if (fields.length === 0) return []
    const { data, error } = await supabase
      .from('custom_fields')
      .insert(fields.map((f, i) => ({ ...f, quiz_id: quizId, order_index: i })))
      .select()
    if (error) throw error
    return data ?? []
  },

  // ── Sessions ──────────────────────────────────────────────────────────────────
  async createSession(quizId: string, adminId: string) {
    const roomCode = generateRoomCode()
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({ quiz_id: quizId, admin_id: adminId, room_code: roomCode, status: 'waiting', current_question_index: 0 })
      .select('*, quiz:quizzes(*)')
      .single()
    if (error) throw error
    return data
  },

  async getSessionByCode(code: string) {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(*, questions(count))')
      .eq('room_code', code.toUpperCase())
      .in('status', ['waiting', 'active'])
      .single()
    if (error) throw error
    return data
  },

  async getSession(id: string) {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(*), participants:session_participants(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async updateSessionStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status }
    if (status === 'active') updates.started_at = new Date().toISOString()
    if (status === 'completed') updates.ended_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('quiz_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async advanceQuestion(sessionId: string, index: number) {
    const { error } = await supabase
      .from('quiz_sessions')
      .update({ current_question_index: index })
      .eq('id', sessionId)
    if (error) throw error
  },

  async joinSession(sessionId: string, studentId: string, displayName: string, avatarSeed: string) {
    // Check if already joined
    const { data: existing } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single()
    if (existing) return existing

    const { data, error } = await supabase
      .from('session_participants')
      .insert({ session_id: sessionId, student_id: studentId, display_name: displayName, avatar_seed: avatarSeed, score: 0, correct_answers: 0, wrong_answers: 0, streak: 0 })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async saveCustomFieldResponses(participantId: string, responses: { field_id: string; value: string }[]) {
    if (responses.length === 0) return
    const { error } = await supabase
      .from('custom_field_responses')
      .upsert(responses.map(r => ({ ...r, participant_id: participantId })))
    if (error) throw error
  },

  async submitAnswer(participantId: string, sessionId: string, questionId: string, selectedOptionIds: string[], textAnswer: string, timeTaken: number, isCorrect: boolean, pointsEarned: number) {
    const { error } = await supabase
      .from('participant_answers')
      .upsert({
        participant_id: participantId,
        session_id: sessionId,
        question_id: questionId,
        selected_option_ids: selectedOptionIds,
        text_answer: textAnswer,
        time_taken: timeTaken,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        answered_at: new Date().toISOString(),
      })
    if (error) throw error

    // Update participant score via RPC
    if (isCorrect) {
      await supabase.rpc('add_participant_score', { participant_id_arg: participantId, points_arg: pointsEarned })
    } else {
      await supabase.rpc('increment_wrong_answers', { participant_id_arg: participantId })
    }
  },

  async getLeaderboard(sessionId: string) {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data ?? []).map((p, i) => ({ ...p, rank: i + 1 }))
  },

  async getAdminSessions(adminId: string) {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(title, thumbnail_url), participants:session_participants(count)')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSessionReport(sessionId: string) {
    const { data: session, error: sessionErr } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(*)')
      .eq('id', sessionId)
      .single()
    if (sessionErr) throw sessionErr

    const { data: customFields, error: fieldsErr } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('order_index')
    if (fieldsErr) throw fieldsErr

    const { data: participants, error: partErr } = await supabase
      .from('session_participants')
      .select(`
        *,
        custom_field_responses (
          field_id,
          value
        )
      `)
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
    if (partErr) throw partErr

    return {
      session,
      customFields,
      participants: participants || []
    }
  },

  async getStudentHistory(studentId: string) {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*, session:quiz_sessions(*, quiz:quizzes(title, thumbnail_url, theme))')
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
