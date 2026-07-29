import { supabase } from '@/lib/supabase'
import type { QuizAnalytics, PlatformStats } from '@/types'

export const analyticsService = {
  async getAdminStats(adminId: string) {
    const [quizzes, sessions, students] = await Promise.all([
      supabase.from('quizzes').select('id', { count: 'exact' }).eq('admin_id', adminId),
      supabase.from('quiz_sessions').select('id', { count: 'exact' }).eq('admin_id', adminId),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student').eq('admin_id', adminId),
    ])

    // Get avg score from recent sessions
    const { data: recentSessions } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('admin_id', adminId)
      .eq('status', 'completed')
      .limit(20)

    let avgScore = 0
    if (recentSessions?.length) {
      const ids = recentSessions.map(s => s.id)
      const { data: scores } = await supabase
        .from('session_participants')
        .select('score')
        .in('session_id', ids)
      if (scores?.length) {
        avgScore = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)
      }
    }

    return {
      totalQuizzes: quizzes.count ?? 0,
      totalSessions: sessions.count ?? 0,
      totalStudents: students.count ?? 0,
      avgScore,
    }
  },

  async getQuizAnalytics(quizId: string): Promise<Partial<QuizAnalytics>> {
    const { data: sessions } = await supabase
      .from('quiz_sessions')
      .select('id, created_at, status')
      .eq('quiz_id', quizId)

    if (!sessions?.length) return { quiz_id: quizId, total_sessions: 0, total_participants: 0, avg_score: 0 }

    const sessionIds = sessions.map(s => s.id)

    const { data: participants } = await supabase
      .from('session_participants')
      .select('score, correct_answers')
      .in('session_id', sessionIds)

    const total_participants = participants?.length ?? 0
    const avg_score = total_participants > 0
      ? Math.round((participants ?? []).reduce((a, p) => a + p.score, 0) / total_participants)
      : 0

    // Daily activity (last 30 days)
    const dailyMap: Record<string, number> = {}
    sessions.forEach(s => {
      const day = s.created_at.slice(0, 10)
      dailyMap[day] = (dailyMap[day] ?? 0) + 1
    })
    const daily_activity = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)

    return {
      quiz_id: quizId,
      total_sessions: sessions.length,
      total_participants,
      avg_score,
      daily_activity,
    }
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const [admins, students, quizzes, sessions] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'admin'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('quizzes').select('id', { count: 'exact' }),
      supabase.from('quiz_sessions').select('id', { count: 'exact' }),
    ])

    const { data: participants } = await supabase
      .from('session_participants')
      .select('id', { count: 'exact' })

    // Monthly trend (last 6 months)
    const { data: monthlySessions } = await supabase
      .from('quiz_sessions')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())

    const monthlyMap: Record<string, { sessions: number; participants: number }> = {}
    monthlySessions?.forEach(s => {
      const month = s.created_at.slice(0, 7)
      if (!monthlyMap[month]) monthlyMap[month] = { sessions: 0, participants: 0 }
      monthlyMap[month].sessions++
    })

    const monthly_trend = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return {
      total_admins: admins.count ?? 0,
      total_students: students.count ?? 0,
      total_quizzes: quizzes.count ?? 0,
      total_sessions: sessions.count ?? 0,
      total_participants: participants?.length ?? 0,
      monthly_trend,
    }
  },

  async getTopPerformers(sessionId: string, limit = 10) {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((p, i) => ({ ...p, rank: i + 1 }))
  },

  async getRecentActivity(adminId: string) {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(title), participants:session_participants(count)')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(10)
    return data ?? []
  },
}
