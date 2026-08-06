import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { analyticsService } from '@/services/analytics.service'
import { Card, StatCard, Spinner } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { BarChart2, Users, Play, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

const CHART_COLORS = ['#7c6fef', '#f928b8', '#00f0ff', '#22c55e', '#ffd700', '#f97316']

export default function AnalyticsPage() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ totalQuizzes: 0, totalSessions: 0, totalStudents: 0, avgScore: 0 })
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  // Real dynamic states
  const [scoreDistribution, setScoreDistribution] = useState([
    { range: '0-20%',  count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%',count: 0 },
  ])

  const [questionTypes, setQuestionTypes] = useState([
    { name: 'Multiple Choice', value: 0 },
    { name: 'True/False',      value: 0 },
    { name: 'Multi-Select',    value: 0 },
    { name: 'Fill-in-the-blank', value: 0 },
    { name: 'Other',           value: 0 },
  ])

  useEffect(() => {
    if (!profile?.id) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        // 1. Fetch core stats and activity
        const [s, a] = await Promise.all([
          analyticsService.getAdminStats(profile.id),
          analyticsService.getRecentActivity(profile.id),
        ])
        setStats(s)

        // Build activity chart from sessions
        const activityMap: Record<string, number> = {}
        ;(a as Array<{ created_at: string }>).forEach(item => {
          const d = item.created_at.slice(0, 10)
          activityMap[d] = (activityMap[d] ?? 0) + 1
        })
        setActivity(Object.entries(activityMap).map(([date, count]) => ({ date: date.slice(5), count })).slice(-14))

        // 2. Fetch real questions data for types chart
        const { data: questions } = await supabase
          .from('questions')
          .select('type, quiz:quizzes!inner(admin_id)')
          .eq('quiz.admin_id', profile.id)

        if (questions) {
          const typeCounts: Record<string, number> = {
            multiple_choice: 0,
            true_false: 0,
            multi_select: 0,
            fill_blank: 0,
            other: 0,
          }
          questions.forEach(q => {
            if (q.type === 'multiple_choice') typeCounts.multiple_choice++
            else if (q.type === 'true_false') typeCounts.true_false++
            else if (q.type === 'multi_select') typeCounts.multi_select++
            else if (q.type === 'fill_blank') typeCounts.fill_blank++
            else typeCounts.other++
          })
          
          setQuestionTypes([
            { name: 'Multiple Choice', value: typeCounts.multiple_choice },
            { name: 'True/False',      value: typeCounts.true_false },
            { name: 'Multi-Select',    value: typeCounts.multi_select },
            { name: 'Fill-in-the-blank', value: typeCounts.fill_blank },
            { name: 'Other',           value: typeCounts.other },
          ].filter(item => item.value > 0)) // Only display types that actually exist
        }

        // 3. Fetch real participant scores to build distribution chart
        const { data: participants } = await supabase
          .from('session_participants')
          .select('correct_answers, session:quiz_sessions!inner(admin_id, quiz:quizzes(question_count))')
          .eq('session.admin_id', profile.id)

        if (participants) {
          const buckets = [0, 0, 0, 0, 0] // 0-20, 21-40, 41-60, 61-80, 81-100
          participants.forEach(p => {
            const session = p.session as any
            const quiz = Array.isArray(session?.quiz) ? session?.quiz[0] : session?.quiz
            const totalQ = quiz?.question_count ?? 0
            if (totalQ > 0) {
              const accuracy = (p.correct_answers / totalQ) * 100
              if (accuracy <= 20) buckets[0]++
              else if (accuracy <= 40) buckets[1]++
              else if (accuracy <= 60) buckets[2]++
              else if (accuracy <= 80) buckets[3]++
              else buckets[4]++
            }
          })
          setScoreDistribution([
            { range: '0-20%',  count: buckets[0] },
            { range: '21-40%', count: buckets[1] },
            { range: '41-60%', count: buckets[2] },
            { range: '61-80%', count: buckets[3] },
            { range: '81-100%',count: buckets[4] },
          ])
        }

      } catch (err) {
        console.error('Error fetching analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.id])

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
        <p className="text-theme-secondary text-sm">Real-time overview of your quiz activity & student performance</p>
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
            {activity.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-theme-secondary">
                No recent activity recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#7c6fef" strokeWidth={2} dot={{ fill: '#7c6fef', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Question types pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <h2 className="text-lg font-bold text-theme-primary mb-6">Question Types Distribution</h2>
            {questionTypes.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-theme-secondary">
                No questions created yet
              </div>
            ) : (
              <>
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
                      <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {q.name} ({q.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Score distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <h2 className="text-lg font-bold text-theme-primary mb-6">Score Accuracy Distribution (%)</h2>
          {scoreDistribution.every(item => item.count === 0) ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-theme-secondary">
              No participant score data recorded yet
            </div>
          ) : (
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
          )}
        </Card>
      </motion.div>
    </div>
  )
}
