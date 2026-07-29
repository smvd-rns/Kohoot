import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { analyticsService } from '@/services/analytics.service'
import { Card, StatCard, Spinner } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { BarChart2, Users, Play, Target } from 'lucide-react'
import { motion } from 'framer-motion'

const CHART_COLORS = ['#7c6fef', '#f928b8', '#00f0ff', '#22c55e', '#ffd700', '#f97316']

export default function AnalyticsPage() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ totalQuizzes: 0, totalSessions: 0, totalStudents: 0, avgScore: 0 })
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      analyticsService.getAdminStats(profile.id),
      analyticsService.getRecentActivity(profile.id),
    ]).then(([s, a]) => {
      setStats(s)
      // Build activity chart from sessions
      const map: Record<string, number> = {}
      ;(a as Array<{ created_at: string }>).forEach(item => {
        const d = item.created_at.slice(0, 10)
        map[d] = (map[d] ?? 0) + 1
      })
      setActivity(Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count })).slice(-14))
    }).finally(() => setLoading(false))
  }, [profile?.id])

  const scoreDistribution = [
    { range: '0-20%',  count: 8 },
    { range: '21-40%', count: 15 },
    { range: '41-60%', count: 30 },
    { range: '61-80%', count: 45 },
    { range: '81-100%',count: 25 },
  ]

  const questionTypes = [
    { name: 'MC',         value: 50 },
    { name: 'T/F',        value: 20 },
    { name: 'Multi',      value: 15 },
    { name: 'Fill',       value: 10 },
    { name: 'Other',      value: 5 },
  ]

  const customTooltipStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-theme-primary">Analytics</h1>
        <p className="text-theme-secondary text-sm">Overview of your quiz activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BarChart2 className="w-6 h-6" style={{ color: '#7c6fef' }} />} label="Quizzes"  value={stats.totalQuizzes}   color="rgba(124,111,239,0.15)" />
        <StatCard icon={<Play      className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Sessions" value={stats.totalSessions}  color="rgba(249,40,184,0.15)" />
        <StatCard icon={<Users     className="w-6 h-6" style={{ color: '#00f0ff' }} />} label="Students" value={stats.totalStudents}  color="rgba(0,240,255,0.15)" />
        <StatCard icon={<Target    className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Avg Score" value={`${stats.avgScore}pts`} color="rgba(34,197,94,0.15)" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-bold text-theme-primary mb-6">Session Activity (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#7c6fef" strokeWidth={2} dot={{ fill: '#7c6fef', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Question types pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <h2 className="text-lg font-bold text-theme-primary mb-6">Question Types</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={questionTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {questionTypes.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {questionTypes.map((q, i) => (
                <div key={q.name} className="flex items-center gap-1 text-xs text-theme-secondary">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  {q.name}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Score distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <h2 className="text-lg font-bold text-theme-primary mb-6">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c6fef" />
                  <stop offset="100%" stopColor="#f928b8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </div>
  )
}
