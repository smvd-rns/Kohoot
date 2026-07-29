import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, BarChart2, Users, BookOpen, Play, TrendingUp, Clock } from 'lucide-react'
import { Card, StatCard, Button, Badge, Avatar, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { analyticsService } from '@/services/analytics.service'
import { quizService } from '@/services/quiz.service'
import { formatDate, timeAgo, getTheme } from '@/lib/utils'
import type { Quiz } from '@/types'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ totalQuizzes: 0, totalSessions: 0, totalStudents: 0, avgScore: 0 })
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([])
  const [recentActivity, setRecentActivity] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    const load = async () => {
      try {
        const [s, quizzes, activity] = await Promise.all([
          analyticsService.getAdminStats(profile.id),
          quizService.listQuizzes(profile.id),
          analyticsService.getRecentActivity(profile.id),
        ])
        setStats(s)
        setRecentQuizzes(quizzes.slice(0, 5))
        setRecentActivity(activity.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile?.id])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 glass rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 glass rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar seed={profile?.avatar_seed ?? 'default'} size="lg" border />
          <div>
            <p className="text-sm text-theme-secondary">{greeting},</p>
            <h1 className="text-2xl font-black text-theme-primary">{profile?.display_name} 👋</h1>
          </div>
        </div>
        <Link to="/admin/quizzes">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Quiz</Button>
        </Link>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="w-6 h-6" style={{ color: '#7c6fef' }} />} label="Total Quizzes"   value={stats.totalQuizzes}  color="rgba(124,111,239,0.15)" trend={{ value: 12, label: 'this month' }} />
        <StatCard icon={<Play     className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Sessions Run"   value={stats.totalSessions}  color="rgba(249,40,184,0.15)"  trend={{ value: 8,  label: 'this week' }} />
        <StatCard icon={<Users    className="w-6 h-6" style={{ color: '#00f0ff' }} />} label="Students"       value={stats.totalStudents}  color="rgba(0,240,255,0.15)"   trend={{ value: 5,  label: 'this week' }} />
        <StatCard icon={<BarChart2 className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Avg Score"     value={`${stats.avgScore}pts`} color="rgba(34,197,94,0.15)" sub="across all quizzes" />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Recent Quizzes ─────────────────────────────────────────────────── */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card padding="none">
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-400" /> Recent Quizzes
              </h2>
              <Link to="/admin/quizzes" className="text-sm text-brand-400 hover:underline">View all</Link>
            </div>
            {recentQuizzes.length === 0 ? (
              <EmptyState
                icon="📝"
                title="No quizzes yet"
                description="Create your first quiz to get started"
                action={<Link to="/admin/quizzes"><Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Create Quiz</Button></Link>}
              />
            ) : (
              <div className="divide-y divide-theme">
                {recentQuizzes.map(quiz => {
                  const theme = getTheme(quiz.theme)
                  return (
                    <div key={quiz.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: theme.gradient }}>
                        {theme.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-theme-primary truncate">{quiz.title}</p>
                        <p className="text-xs text-theme-secondary">{quiz.question_count} questions · {quiz.total_plays} plays</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={quiz.is_published ? 'success' : 'default'}>
                          {quiz.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <Link to={`/admin/quizzes/${quiz.id}/edit`}>
                          <Button variant="ghost" size="xs">Edit</Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Quick actions + recent activity ────────────────────────────────── */}
        <div className="space-y-6">
          <motion.div variants={item}>
            <Card>
              <h2 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-400" /> Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  { icon: Plus,      label: 'Create Quiz',    to: '/admin/quizzes',   color: '#7c6fef' },
                  { icon: Play,      label: 'Start Session',  to: '/admin/sessions',  color: '#f928b8' },
                  { icon: Users,     label: 'Add Students',   to: '/admin/students',  color: '#00f0ff' },
                  { icon: BarChart2, label: 'View Analytics', to: '/admin/analytics', color: '#22c55e' },
                ].map(a => (
                  <Link key={a.to} to={a.to}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${a.color}20` }}>
                        <a.icon className="w-4 h-4" style={{ color: a.color }} />
                      </div>
                      <span className="text-sm font-medium text-theme-primary">{a.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <h2 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" /> Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-theme-secondary text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {(recentActivity as Array<{ id: string; quiz: { title: string }; created_at: string; status: string }>).map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-theme-primary font-medium">{a.quiz?.title}</p>
                        <p className="text-xs text-theme-secondary">{timeAgo(a.created_at)} · {a.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
