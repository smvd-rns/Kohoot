import { supabase } from '@/lib/supabase'
import type { Quiz, QuizFormData, Question, AnswerOption, CustomField } from '@/types'
import { generateRoomCode } from '@/lib/utils'

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise(resolve => setTimeout(resolve, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}


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
        const { answer_options, id: _qId, created_at: _qCreated, ...qData } = q
        const { data: newQ, error: qErr } = await supabase
          .from('questions')
          .insert({ ...qData, quiz_id: newQuiz.id })
          .select()
          .single()
        if (qErr) throw qErr

        if (newQ && answer_options) {
          const { error: optErr } = await supabase.from('answer_options').insert(
            answer_options.map(({ id: _oId, ...o }) => ({ ...o, question_id: newQ.id }))
          )
          if (optErr) throw optErr
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
  async createSession(quizId: string, adminId: string, opts?: { mode?: 'live' | 'self_paced'; deadline?: string; participantMode?: 'any' | 'registered_only' }) {
    const roomCode = generateRoomCode()
    const insertData: Record<string, unknown> = {
      quiz_id: quizId,
      admin_id: adminId,
      room_code: roomCode,
      status: opts?.mode === 'self_paced' ? 'self_paced' : 'waiting',
      mode: opts?.mode ?? 'live',
      participant_mode: opts?.participantMode ?? 'any',
      current_question_index: 0,
    }
    if (opts?.deadline) insertData.deadline = opts.deadline
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert(insertData)
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
      .in('status', ['waiting', 'active', 'self_paced'])
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
      .upsert(
        responses.map(r => ({ ...r, participant_id: participantId })),
        { onConflict: 'participant_id,field_id' }
      )
    if (error) throw error
  },

  async resetParticipantProgress(participantId: string) {
    const { error } = await supabase
      .from('session_participants')
      .update({
        score: 0,
        correct_answers: 0,
        wrong_answers: 0,
        streak: 0,
        student_question_index: 0,
        is_finished: false,
        finished_at: null
      })
      .eq('id', participantId)
    if (error) throw error

    await supabase.from('participant_answers').delete().eq('participant_id', participantId)
  },

  async submitAnswer(participantId: string, sessionId: string, questionId: string, selectedOptionIds: string[], textAnswer: string, timeTaken: number, isCorrect: boolean, pointsEarned: number) {
    await withRetry(async () => {
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
        }, { onConflict: 'participant_id,question_id' })
      if (error) throw error

      // Update participant score via RPC
      if (isCorrect) {
        const { error: rpcErr } = await supabase.rpc('add_participant_score', { participant_id_arg: participantId, points_arg: pointsEarned })
        if (rpcErr) throw rpcErr
      } else {
        const { error: rpcErr } = await supabase.rpc('increment_wrong_answers', { participant_id_arg: participantId })
        if (rpcErr) throw rpcErr
      }
    })
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

  // ── Self-Paced Mode ───────────────────────────────────────────────────────────

  async advanceStudentQuestion(participantId: string, index: number) {
    const { error } = await supabase
      .from('session_participants')
      .update({ student_question_index: index })
      .eq('id', participantId)
    if (error) throw error
  },

  async finishStudentSession(participantId: string) {
    const { data: part } = await supabase
      .from('session_participants')
      .select('student_id, score')
      .eq('id', participantId)
      .single()

    const { error } = await supabase
      .from('session_participants')
      .update({ is_finished: true, finished_at: new Date().toISOString() })
      .eq('id', participantId)
    if (error) throw error

    if (part?.student_id) {
      if (part.score > 0) {
        await supabase.rpc('add_xp', { user_id_arg: part.student_id, xp_arg: part.score })
      }
      try {
        const { studentService } = await import('./student.service')
        await studentService.checkAndAwardAchievements(part.student_id)
      } catch (err) {
        console.error('Failed to award achievements:', err)
      }
    }
  },

  // Get open self-paced sessions for a given admin (to show on student dashboard)
  async getOpenSelfPacedSessions() {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(title, thumbnail_url, theme, question_count)')
      .eq('status', 'self_paced')
      .or(`deadline.is.null,deadline.gt.${now}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  // Check if the student already has a participant record for a session
  async getStudentParticipant(sessionId: string, studentId: string) {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single()
    return data ?? null
  },

  // Check if the student has completed ANY session for a given quiz
  async hasStudentCompletedQuiz(quizId: string, studentId: string) {
    const { data } = await supabase
      .from('session_participants')
      .select('id, is_finished, session:quiz_sessions!inner(id, quiz_id)')
      .eq('student_id', studentId)
      .eq('session.quiz_id', quizId)
      .eq('is_finished', true)
      .limit(1)
    return data && data.length > 0
  },

  // ── Cross-Session All-Time Leaderboard ─────────────────────────────────────
  // Aggregates scores for registered (non-guest) students across all admin sessions.
  // Guest emails always start with 'guest_', so we exclude them.
  async getCrossSessionLeaderboard(adminId: string, dateFrom?: string, dateTo?: string, role?: string) {
    let query = supabase
      .from('session_participants')
      .select(`
        student_id,
        score,
        correct_answers,
        wrong_answers,
        session_id,
        profile:profiles!session_participants_student_id_fkey(id, display_name, avatar_seed, email),
        session:quiz_sessions!session_participants_session_id_fkey(admin_id, created_at, quiz:quizzes(title))
      `)

    const { data, error } = await query
    if (error) throw error
    if (!data) return []

    // Filter: only this admin's sessions (unless super_admin), only registered students (non-guest email)
    const filtered = (data as any[]).filter(row => {
      const isAdminSession = role === 'super_admin' || row.session?.admin_id === adminId
      const isRegistered = row.profile?.email && !row.profile.email.startsWith('guest_')
      if (!isAdminSession || !isRegistered) return false
      if (dateFrom && row.session?.created_at < dateFrom) return false
      if (dateTo && row.session?.created_at > dateTo) return false
      return true
    })

    // Aggregate by student_id
    const map = new Map<string, {
      student_id: string
      display_name: string
      avatar_seed: string
      sessions: number
      total_score: number
      best_score: number
      total_correct: number
      total_wrong: number
    }>()

    for (const row of filtered) {
      const id = row.student_id
      if (!map.has(id)) {
        map.set(id, {
          student_id: id,
          display_name: row.profile?.display_name ?? 'Unknown',
          avatar_seed: row.profile?.avatar_seed ?? 'default',
          sessions: 0,
          total_score: 0,
          best_score: 0,
          total_correct: 0,
          total_wrong: 0,
        })
      }
      const entry = map.get(id)!
      entry.sessions += 1
      entry.total_score += row.score ?? 0
      entry.best_score = Math.max(entry.best_score, row.score ?? 0)
      entry.total_correct += row.correct_answers ?? 0
      entry.total_wrong += row.wrong_answers ?? 0
    }

    return Array.from(map.values())
      .sort((a, b) => b.total_score - a.total_score)
      .map((entry, i) => ({ ...entry, rank: i + 1,
        avg_score: entry.sessions > 0 ? Math.round(entry.total_score / entry.sessions) : 0
      }))
  },

  async getAdminSessions(adminId: string, role?: string) {
    let query = supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(title, thumbnail_url), participants:session_participants(count)')
      
    if (role !== 'super_admin') {
      query = query.eq('admin_id', adminId)
    }

    const { data, error } = await query
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
