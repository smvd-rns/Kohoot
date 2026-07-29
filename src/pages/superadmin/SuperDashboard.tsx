import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { StatCard, Card, EmptyState } from '@/components/ui'
import { analyticsService } from '@/services/analytics.service'
import { studentService } from '@/services/student.service'
import { Shield, Users, BookOpen, Play } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { PlatformStats } from '@/types'

export default function SuperDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    analyticsService.getPlatformStats().then(setStats)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-theme-primary">Super Admin Dashboard</h1>
        <p className="text-theme-secondary text-sm">Platform-wide overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Shield    className="w-6 h-6" style={{ color: '#7c6fef' }} />} label="Admins"       value={stats?.total_admins ?? 0}       color="rgba(124,111,239,0.15)" />
        <StatCard icon={<Users     className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Students"     value={stats?.total_students ?? 0}     color="rgba(249,40,184,0.15)" />
        <StatCard icon={<BookOpen  className="w-6 h-6" style={{ color: '#00f0ff' }} />} label="Quizzes"      value={stats?.total_quizzes ?? 0}      color="rgba(0,240,255,0.15)" />
        <StatCard icon={<Play      className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Sessions"     value={stats?.total_sessions ?? 0}     color="rgba(34,197,94,0.15)" />
      </div>

      {stats?.monthly_trend?.length ? (
        <Card>
          <h2 className="text-lg font-bold text-theme-primary mb-6">Monthly Growth</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 }} />
              <Line type="monotone" dataKey="sessions" stroke="#7c6fef" strokeWidth={2} dot={{ fill: '#7c6fef', r: 4 }} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ) : null}
    </div>
  )
}
