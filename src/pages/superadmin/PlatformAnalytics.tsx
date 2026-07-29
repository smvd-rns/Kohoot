import { useEffect, useState } from 'react'
import { StatCard, Card } from '@/components/ui'
import { analyticsService } from '@/services/analytics.service'
import { BarChart2, Users, BookOpen, Play } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { PlatformStats } from '@/types'

export default function PlatformAnalytics() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => { analyticsService.getPlatformStats().then(setStats) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">Platform Analytics</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BarChart2 className="w-6 h-6" style={{ color: '#7c6fef' }} />} label="Quizzes"  value={stats?.total_quizzes ?? 0}  color="rgba(124,111,239,0.15)" />
        <StatCard icon={<Play      className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Sessions" value={stats?.total_sessions ?? 0} color="rgba(249,40,184,0.15)" />
        <StatCard icon={<Users     className="w-6 h-6" style={{ color: '#00f0ff' }} />} label="Students"  value={stats?.total_students ?? 0} color="rgba(0,240,255,0.15)" />
        <StatCard icon={<BookOpen  className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Admins"   value={stats?.total_admins ?? 0}   color="rgba(34,197,94,0.15)" />
      </div>
      {stats?.monthly_trend?.length ? (
        <Card>
          <h2 className="text-lg font-bold text-theme-primary mb-6">Platform Activity</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 }} />
              <Bar dataKey="sessions" fill="url(#grad)" radius={[4, 4, 0, 0]} name="Sessions" />
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c6fef" /><stop offset="100%" stopColor="#f928b8" /></linearGradient></defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : null}
    </div>
  )
}
