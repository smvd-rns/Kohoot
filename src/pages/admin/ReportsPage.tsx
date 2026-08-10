import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { quizService } from '@/services/quiz.service'
import { Card, StatCard, Spinner, Button, Badge, Avatar, EmptyState } from '@/components/ui'
import {
  ArrowLeft,
  Calendar,
  Users,
  Award,
  Download,
  Search,
  Trophy,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { formatDate, timeAgo, getTheme } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { QuizSession, SessionParticipant, CustomField } from '@/types'

type ParticipantWithResponses = SessionParticipant & {
  custom_field_responses?: Array<{ field_id: string; value: string }>
}

type ReportData = {
  session: QuizSession & { quiz?: { title: string; description?: string; thumbnail_url?: string; theme?: string; question_count: number; passing_score: number } }
  customFields: CustomField[]
  participants: ParticipantWithResponses[]
}

export default function ReportsPage() {
  const { profile } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session')

  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mainTab, setMainTab] = useState<'sessions' | 'all_time'>('sessions')
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [sessionsPage, setSessionsPage] = useState(1)
  const [sessionsPageSize, setSessionsPageSize] = useState(10)
  const [allTimePage, setAllTimePage] = useState(1)
  const [allTimePageSize, setAllTimePageSize] = useState(10)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(10)

  // Load admin's sessions
  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    Promise.all([
      quizService.getAdminSessions(profile.id, profile.role),
      quizService.getCrossSessionLeaderboard(profile.id, undefined, undefined, profile.role)
    ])
      .then(([sessionsData, allTimeData]) => {
        setSessions(sessionsData as unknown as QuizSession[])
        setAllTimeLeaderboard(allTimeData)
      })
      .catch(() => toast.error('Failed to load session data'))
      .finally(() => setLoading(false))
  }, [profile?.id])

  // Load specific session report if selected
  useEffect(() => {
    if (!sessionIdFromUrl) {
      setReport(null)
      return
    }
    setLoading(true)
    quizService
      .getSessionReport(sessionIdFromUrl)
      .then(data => {
        setReport(data as unknown as ReportData)
      })
      .catch(() => {
        toast.error('Failed to load session report')
        setSearchParams({})
      })
      .finally(() => setLoading(false))
  }, [sessionIdFromUrl, setSearchParams])

  const handleSelectSession = (id: string) => {
    setSearchParams({ session: id })
  }

  const handleBack = () => {
    setSearchParams({})
  }

  // Filtered session list
  const filteredSessions = sessions.filter(s => {
    const qTitle = s.quiz?.title?.toLowerCase() || ''
    const room = s.room_code?.toLowerCase() || ''
    const q = searchQuery.toLowerCase()
    return qTitle.includes(q) || room.includes(q)
  })

  // CSV Export utility
  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${formatDate(new Date().toISOString()).replace(/[^a-z0-9]/gi, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report exported successfully!')
  }

  // Export unified report (Leaderboard + Custom fields)
  const handleExportReport = () => {
    if (!report) return
    const customHeaders = report.customFields.map(f => f.label)
    const headers = ['Rank', 'Participant Name', 'Score', 'Correct Answers', 'Wrong Answers', 'Accuracy (%)', ...customHeaders]
    
    const rows = report.participants.map((p, idx) => {
      const totalQuestions = report.session.quiz?.question_count ?? 0
      const accuracy = totalQuestions > 0 ? Math.round((p.correct_answers / totalQuestions) * 100) : 0
      
      const row = [
        (idx + 1).toString(),
        p.display_name,
        p.score.toString(),
        p.correct_answers.toString(),
        p.wrong_answers.toString(),
        `${accuracy}%`
      ]
      
      report.customFields.forEach(f => {
        const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
        row.push(resp?.value || '-')
      })
      
      return row
    })
    
    exportToCSV(headers, rows, `${report.session.quiz?.title || 'Quiz'}_Report`)
  }

  // Export all-time leaderboard
  const handleExportAllTime = () => {
    if (allTimeLeaderboard.length === 0) return
    const headers = ['Rank', 'Student Name', 'Total Sessions', 'Total Score', 'Average Score', 'Best Score', 'Total Correct', 'Total Wrong']
    const rows = allTimeLeaderboard.map((p, idx) => [
      (idx + 1).toString(),
      p.display_name,
      p.sessions.toString(),
      p.total_score.toString(),
      p.avg_score.toString(),
      p.best_score.toString(),
      p.total_correct.toString(),
      p.total_wrong.toString()
    ])
    exportToCSV(headers, rows, 'All_Time_Leaderboard')
  }

  const loadFilteredAllTime = () => {
    if (!profile?.id) return
    quizService.getCrossSessionLeaderboard(profile.id, dateFilter.from, dateFilter.to)
      .then(data => setAllTimeLeaderboard(data))
      .catch(() => toast.error('Failed to filter leaderboard'))
  }


  if (loading && !report && sessions.length === 0) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!report ? (
          // SESSIONS LIST VIEW (Clean Table Row List)
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-theme-primary">Quiz Reports</h1>
                <p className="text-theme-secondary text-sm">Select a quiz session below or check the combined student leaderboard.</p>
              </div>

              {mainTab === 'sessions' ? (
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-secondary" />
                  <input
                    type="text"
                    placeholder="Search by quiz or room code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={e => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    className="input-field py-1.5 px-3 text-xs w-auto"
                  />
                  <span className="text-xs text-theme-secondary">to</span>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={e => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    className="input-field py-1.5 px-3 text-xs w-auto"
                  />
                  <Button size="xs" onClick={loadFilteredAllTime}>Filter</Button>
                  <Button size="xs" variant="outline" leftIcon={<Download className="w-3 h-3" />} onClick={handleExportAllTime}>Export</Button>
                </div>
              )}
            </div>

            {/* Main Tabs */}
            <div className="flex border-b border-theme mb-4">
              <button
                onClick={() => setMainTab('sessions')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${mainTab === 'sessions' ? 'border-brand-500 text-brand-400' : 'border-transparent text-theme-secondary hover:text-theme-primary'}`}
              >
                📊 Session Reports
              </button>
              <button
                onClick={() => setMainTab('all_time')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${mainTab === 'all_time' ? 'border-brand-500 text-brand-400' : 'border-transparent text-theme-secondary hover:text-theme-primary'}`}
              >
                🏆 All-Time Leaderboard (Registered Students)
              </button>
            </div>

            {mainTab === 'sessions' ? (
              filteredSessions.length === 0 ? (
                <EmptyState
                  icon="📊"
                  title="No reports found"
                  description={searchQuery ? "Try searching for another keyword" : "Conduct a quiz session to generate reports"}
                />
              ) : (
                <Card padding="none">
                  {/* Existing sessions table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                        <th className="px-6 py-4">Quiz</th>
                        <th className="px-6 py-4 text-center">Room Code</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4">Conducted</th>
                        <th className="px-6 py-4 text-center">Students</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme text-sm">
                      {filteredSessions.slice((sessionsPage - 1) * sessionsPageSize, sessionsPage * sessionsPageSize).map(s => {
                        const theme = getTheme(s.quiz?.theme as never ?? 'modern')
                        const participantCount = (s as unknown as { participants?: [{ count: number }] }).participants?.[0]?.count ?? 0

                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-white/3 transition-colors cursor-pointer"
                            onClick={() => handleSelectSession(s.id)}
                          >
                            <td className="px-6 py-4 font-semibold text-theme-primary">
                              <div className="flex items-center gap-3">
                                <span className="text-xl bg-white/5 p-1.5 rounded-lg">{theme.emoji}</span>
                                <div>
                                  <p className="font-bold text-theme-primary">{s.quiz?.title || 'Quiz'}</p>
                                  {s.quiz?.category && <p className="text-xs text-theme-secondary font-medium mt-0.5">{s.quiz.category}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-theme-primary text-xs font-bold tracking-wider">
                                {s.room_code}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant={s.status === 'completed' ? 'default' : s.status === 'active' ? 'success' : 'warning'}>
                                  {s.status}
                                </Badge>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-theme-secondary">
                                  {s.mode === 'self_paced' ? '📋 Self-Paced' : '🎮 Live'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-theme-secondary">
                              <p className="font-medium">{formatDate(s.created_at)}</p>
                              <p className="text-xs opacity-75 mt-0.5">{timeAgo(s.created_at)}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-theme-primary">
                              {participantCount}
                            </td>
                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <Button
                                size="xs"
                                variant="ghost"
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                onClick={() => handleSelectSession(s.id)}
                              >
                                View Report
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sessions Pagination */}
                {filteredSessions.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
                    <div className="flex items-center gap-2 text-sm text-theme-secondary">
                      <span>Show</span>
                      <select
                        value={sessionsPageSize}
                        onChange={e => {
                          setSessionsPageSize(Number(e.target.value))
                          setSessionsPage(1)
                        }}
                        className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {[10, 30, 50].map(size => (
                          <option key={size} value={size} className="bg-neutral-900 text-white">
                            {size}
                          </option>
                        ))}
                      </select>
                      <span>entries per page</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-theme-secondary">
                        Page <strong>{sessionsPage}</strong> of <strong>{Math.ceil(filteredSessions.length / sessionsPageSize) || 1}</strong> ({filteredSessions.length} entries)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                          disabled={sessionsPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionsPage(p => Math.min(Math.ceil(filteredSessions.length / sessionsPageSize), p + 1))}
                          disabled={sessionsPage === Math.ceil(filteredSessions.length / sessionsPageSize) || Math.ceil(filteredSessions.length / sessionsPageSize) === 0}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )) : (
              // ALL TIME LEADERBOARD TABLE
              allTimeLeaderboard.length === 0 ? (
                <EmptyState
                  icon="🏆"
                  title="No registered student data found"
                  description="Scores will appear here when registered students submit answers in your quiz sessions."
                />
              ) : (
                <Card padding="none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-theme text-theme-secondary text-xs font-bold uppercase">
                          <th className="px-6 py-4">Rank</th>
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4 text-center">Sessions Played</th>
                          <th className="px-6 py-4 text-right">Total Score</th>
                          <th className="px-6 py-4 text-right">Average Score</th>
                          <th className="px-6 py-4 text-right">Best Score</th>
                          <th className="px-6 py-4 text-center text-success-400">Total Correct</th>
                          <th className="px-6 py-4 text-center text-danger-400">Total Wrong</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme text-sm">
                        {allTimeLeaderboard.slice((allTimePage - 1) * allTimePageSize, allTimePage * allTimePageSize).map((p, idx) => (
                          <tr key={p.student_id} className="hover:bg-white/3 transition-colors">
                            <td className="px-6 py-4 font-bold text-theme-primary">
                              {(allTimePage - 1) * allTimePageSize + idx === 0 ? '🥇' : (allTimePage - 1) * allTimePageSize + idx === 1 ? '🥈' : (allTimePage - 1) * allTimePageSize + idx === 2 ? '🥉' : `#${(allTimePage - 1) * allTimePageSize + idx + 1}`}
                            </td>
                            <td className="px-6 py-4 flex items-center gap-3">
                              <Avatar seed={p.avatar_seed} size="xs" />
                              <span className="font-semibold text-theme-primary">{p.display_name}</span>
                            </td>
                            <td className="px-6 py-4 text-center font-semibold text-theme-secondary">
                              {p.sessions}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-theme-primary">
                              {p.total_score} pts
                            </td>
                            <td className="px-6 py-4 text-right text-brand-400 font-semibold">
                              {p.avg_score} pts
                            </td>
                            <td className="px-6 py-4 text-right text-theme-secondary">
                              {p.best_score} pts
                            </td>
                            <td className="px-6 py-4 text-center text-success-400 font-bold">
                              {p.total_correct}
                            </td>
                            <td className="px-6 py-4 text-center text-danger-400 font-bold">
                              {p.total_wrong}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* All-Time Pagination */}
                  {allTimeLeaderboard.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
                      <div className="flex items-center gap-2 text-sm text-theme-secondary">
                        <span>Show</span>
                        <select
                          value={allTimePageSize}
                          onChange={e => {
                            setAllTimePageSize(Number(e.target.value))
                            setAllTimePage(1)
                          }}
                          className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {[10, 30, 50].map(size => (
                            <option key={size} value={size} className="bg-neutral-900 text-white">
                              {size}
                            </option>
                          ))}
                        </select>
                        <span>entries per page</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm text-theme-secondary">
                          Page <strong>{allTimePage}</strong> of <strong>{Math.ceil(allTimeLeaderboard.length / allTimePageSize) || 1}</strong> ({allTimeLeaderboard.length} entries)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAllTimePage(p => Math.max(1, p - 1))}
                            disabled={allTimePage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAllTimePage(p => Math.min(Math.ceil(allTimeLeaderboard.length / allTimePageSize), p + 1))}
                            disabled={allTimePage === Math.ceil(allTimeLeaderboard.length / allTimePageSize) || Math.ceil(allTimeLeaderboard.length / allTimePageSize) === 0}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            )}
          </motion.div>
        ) : (
          // SESSION DETAIL REPORT VIEW
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header / Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-theme-primary">{report.session.quiz?.title} Report</h1>
                    <Badge variant={report.session.mode === 'self_paced' ? 'warning' : 'info'}>
                      {report.session.mode === 'self_paced' ? '📋 Self-Paced' : '🎮 Live'}
                    </Badge>
                  </div>
                  <p className="text-theme-secondary text-sm flex items-center gap-2 flex-wrap mt-0.5">
                    <span>Room Code: <strong className="text-theme-primary">{report.session.room_code}</strong></span>
                    <span>•</span>
                    <span>Conducted {timeAgo(report.session.created_at)}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportReport}>
                  Export Report
                </Button>
              </div>
            </div>

            {/* Quick Stats overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-6 h-6" style={{ color: '#00f0ff' }} />}
                label="Participants"
                value={report.participants.length}
                color="rgba(0,240,255,0.15)"
              />
              <StatCard
                icon={<Trophy className="w-6 h-6" style={{ color: '#ffd700' }} />}
                label="Average Score"
                value={`${report.participants.length > 0 ? Math.round(report.participants.reduce((acc, p) => acc + p.score, 0) / report.participants.length) : 0} pts`}
                color="rgba(255,215,0,0.15)"
              />
              <StatCard
                icon={<CheckCircle2 className="w-6 h-6" style={{ color: '#22c55e' }} />}
                label="Passing Rate"
                value={`${
                  report.participants.length > 0
                    ? Math.round(
                        (report.participants.filter(p => {
                          const totalQ = report.session.quiz?.question_count ?? 1
                          const scorePercent = (p.correct_answers / totalQ) * 100
                          return scorePercent >= (report.session.quiz?.passing_score ?? 60)
                        }).length /
                          report.participants.length) *
                          100
                      )
                    : 0
                }%`}
                color="rgba(34,197,94,0.15)"
              />
              <StatCard
                icon={<Award className="w-6 h-6" style={{ color: '#f928b8' }} />}
                label="Top Scorer"
                value={report.participants[0]?.display_name || '-'}
                color="rgba(249,40,184,0.15)"
              />
            </div>
               {/* Unified Combined Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-theme text-theme-secondary text-xs font-bold uppercase">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-right">Score</th>
                      <th className="py-3 px-4 text-center">Correct</th>
                      <th className="py-3 px-4 text-center">Wrong</th>
                      <th className="py-3 px-4 text-right">Accuracy</th>
                      {report.customFields.map(f => (
                        <th key={f.id} className="py-3 px-4 min-w-[120px]">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme/40 text-sm">
                    {report.participants.length === 0 ? (
                      <tr>
                        <td colSpan={6 + report.customFields.length} className="text-center py-8 text-theme-secondary">
                          No students attended this session.
                        </td>
                      </tr>
                    ) : (
                      report.participants.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize).map((p, idx) => {
                        const totalQ = report.session.quiz?.question_count ?? 0
                        const accuracy = totalQ > 0 ? Math.round((p.correct_answers / totalQ) * 100) : 0
                        return (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-bold text-theme-primary">
                              {(detailPage - 1) * detailPageSize + idx === 0 ? '🥇' : (detailPage - 1) * detailPageSize + idx === 1 ? '🥈' : (detailPage - 1) * detailPageSize + idx === 2 ? '🥉' : `#${(detailPage - 1) * detailPageSize + idx + 1}`}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar seed={p.avatar_seed} size="xs" />
                                <span className="font-semibold text-theme-primary">{p.display_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-theme-primary">{p.score} pts</td>
                            <td className="py-3 px-4 text-center text-success-400 font-semibold">{p.correct_answers}</td>
                            <td className="py-3 px-4 text-center text-danger-400 font-semibold">{p.wrong_answers}</td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 50 ? 'warning' : 'danger'}>
                                {accuracy}%
                              </Badge>
                            </td>
                            {report.customFields.map(f => {
                              const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
                              return (
                                <td key={f.id} className="py-3 px-4 text-theme-secondary font-medium">
                                  {resp?.value || <span className="text-white/20 italic">Not filled</span>}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Detail Report Pagination */}
              {report.participants.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
                  <div className="flex items-center gap-2 text-sm text-theme-secondary">
                    <span>Show</span>
                    <select
                      value={detailPageSize}
                      onChange={e => {
                        setDetailPageSize(Number(e.target.value))
                        setDetailPage(1)
                      }}
                      className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {[10, 30, 50].map(size => (
                        <option key={size} value={size} className="bg-neutral-900 text-white">
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>entries per page</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-theme-secondary">
                      Page <strong>{detailPage}</strong> of <strong>{Math.ceil(report.participants.length / detailPageSize) || 1}</strong> ({report.participants.length} entries)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                        disabled={detailPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailPage(p => Math.min(Math.ceil(report.participants.length / detailPageSize), p + 1))}
                        disabled={detailPage === Math.ceil(report.participants.length / detailPageSize) || Math.ceil(report.participants.length / detailPageSize) === 0}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

