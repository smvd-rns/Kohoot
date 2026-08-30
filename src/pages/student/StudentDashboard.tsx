import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, BookOpen, Trophy, Target, Plus, Clock, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, StatCard, Avatar, Button, Badge, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { studentService } from '@/services/student.service'
import { quizService } from '@/services/quiz.service'
import { timeAgo, getTheme, xpForLevel } from '@/lib/utils'

export default function StudentDashboard() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalQuizzes: 0, avgScore: 0, totalCorrect: 0, bestScore: 0 })
  const [history, setHistory] = useState<unknown[]>([])

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      studentService.getStudentStats(profile.id),
      quizService.getStudentHistory(profile.id),
    ]).then(([s, h]) => {
      setStats(s)
      setHistory(h.slice(0, 5))
    })
  }, [profile?.id])

  const getXpProgress = (xp: number, level: number) => {
    let totalXpForCurrentLevel = 0
    for (let l = 1; l < level; l++) {
      totalXpForCurrentLevel += xpForLevel(l)
    }
    const currentXpInLevel = xp - totalXpForCurrentLevel
    const needed = xpForLevel(level)
    return {
      current: currentXpInLevel,
      needed,
      percent: Math.min(100, Math.max(0, (currentXpInLevel / needed) * 100))
    }
  }

  const { current: currentXp, needed: xpNeeded, percent: progressPercent } = getXpProgress(profile?.xp ?? 0, profile?.level ?? 1)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Hero */}
      <div className="glass rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand opacity-10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar seed={profile?.avatar_seed ?? 'default'} size="xl" border />
          <div className="flex-1">
            <h1 className="text-2xl font-black text-theme-primary">Hi, {profile?.display_name} 👋</h1>
            <p className="text-theme-secondary text-sm mt-1">Level {profile?.level} · {profile?.xp.toLocaleString()} XP</p>
            <div className="mt-3 max-w-xs">
              <div className="flex justify-between text-xs text-theme-secondary mb-1">
                <span>XP Progress</span>
                <span>{currentXp} / {xpNeeded}</span>
              </div>
              <div className="h-2 rounded-full glass overflow-hidden">
                <motion.div className="h-2 rounded-full bg-gradient-brand" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
            </div>
          </div>
          <Link to="/student/join">
            <Button size="lg" leftIcon={<Plus className="w-5 h-5" />}>Join Quiz</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="w-6 h-6" style={{ color: '#7c6fef' }} />} label="Quizzes Taken"  value={stats.totalQuizzes} color="rgba(124,111,239,0.15)" />
        <StatCard icon={<Target   className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Avg Score"     value={`${stats.avgScore} pts`} color="rgba(249,40,184,0.15)" />
        <StatCard icon={<Zap      className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Correct Answers" value={stats.totalCorrect} color="rgba(34,197,94,0.15)" />
        <StatCard icon={<Trophy   className="w-6 h-6" style={{ color: '#ffd700' }} />} label="Best Score"    value={`${stats.bestScore} pts`} color="rgba(255,215,0,0.15)" />
      </div>


      {/* Recent history */}
      <Card padding="none">
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <h2 className="text-lg font-bold text-theme-primary">Recent Quizzes</h2>
          <Link to="/student/history" className="text-sm text-brand-400 hover:underline">View all</Link>
        </div>
        {history.length === 0 ? (
          <EmptyState icon="🎮" title="No quizzes yet" description="Join a quiz to get started!" action={<Link to="/student/join"><Button leftIcon={<Plus className="w-4 h-4" />}>Join Quiz</Button></Link>} />
        ) : (
          <div className="divide-y divide-theme">
            {(history as Array<{ id: string; score: number; correct_answers: number; joined_at: string; session: { title?: string; quiz: { title: string; theme: string } } }>).map(h => {
              const theme = getTheme(h.session?.quiz?.theme as never ?? 'modern')
              return (
                <div key={h.id} className="flex items-center gap-4 p-4 hover:bg-white/3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: theme.gradient }}>{theme.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-theme-primary truncate">{h.session?.title || h.session?.quiz?.title || 'Quiz'}</p>
                    <p className="text-xs text-theme-secondary">{timeAgo(h.joined_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-400">{h.score.toLocaleString()} pts</p>
                    <p className="text-xs text-theme-secondary">{h.correct_answers} correct</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
