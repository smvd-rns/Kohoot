import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const studentService = {
  async listStudents(adminId: string): Promise<Profile[]> {
    const { data: sessions } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('admin_id', adminId)

    if (!sessions || sessions.length === 0) return []
    const sessionIds = sessions.map(s => s.id)

    const { data: participations } = await supabase
      .from('session_participants')
      .select('student_id')
      .in('session_id', sessionIds)

    if (!participations || participations.length === 0) return []
    const studentIds = Array.from(new Set(participations.map(p => p.student_id)))

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getAllStudents(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getStudentStats(studentId: string) {
    const { data: participations } = await supabase
      .from('session_participants')
      .select('score, correct_answers, wrong_answers, session:quiz_sessions(quiz:quizzes(question_count))')
      .eq('student_id', studentId)

    if (!participations?.length) return { totalQuizzes: 0, avgScore: 0, totalCorrect: 0, bestScore: 0 }

    const totalQuizzes = participations.length
    const avgScore = Math.round(participations.reduce((a, p) => a + p.score, 0) / totalQuizzes)
    const totalCorrect = participations.reduce((a, p) => a + p.correct_answers, 0)
    const bestScore = Math.max(...participations.map(p => p.score))

    return { totalQuizzes, avgScore, totalCorrect, bestScore }
  },

  async getAchievements(studentId: string) {
    const { data, error } = await supabase
      .from('student_achievements')
      .select('*, achievement:achievements(*)')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async checkAndAwardAchievements(studentId: string): Promise<void> {
    const stats = await this.getStudentStats(studentId)
    const earned = await this.getAchievements(studentId)
    const earnedIds = earned.map((e: { achievement_id: string }) => e.achievement_id)

    const { data: allAchievements } = await supabase.from('achievements').select('*')
    if (!allAchievements) return

    for (const ach of allAchievements) {
      if (earnedIds.includes(ach.id)) continue
      let shouldAward = false
      if (ach.condition_type === 'quiz_count' && stats.totalQuizzes >= ach.condition_value) shouldAward = true
      if (ach.condition_type === 'score' && stats.bestScore >= ach.condition_value) shouldAward = true

      if (shouldAward) {
        await supabase.from('student_achievements').insert({ student_id: studentId, achievement_id: ach.id, earned_at: new Date().toISOString() })
        // XP is added via RPC function below
        await supabase.rpc('add_xp', { user_id_arg: studentId, xp_arg: ach.xp_reward })
      }
    }
  },

  async deleteStudent(studentId: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', studentId)
    if (error) throw error
  },
}
