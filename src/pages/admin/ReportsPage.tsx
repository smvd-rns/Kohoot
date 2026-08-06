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
  CheckCircle2
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
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'custom_fields'>('leaderboard')

  // Load admin's sessions
  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    quizService
      .getAdminSessions(profile.id)
      .then(data => {
        setSessions(data as unknown as QuizSession[])
      })
      .catch(() => toast.error('Failed to load sessions'))
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
    setActiveTab('leaderboard')
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

  // Export leaderboard
  const handleExportLeaderboard = () => {
    if (!report) return
    const headers = ['Rank', 'Participant Name', 'Score', 'Correct Answers', 'Wrong Answers', 'Accuracy (%)']
    const rows = report.participants.map((p, idx) => {
      const totalQuestions = report.session.quiz?.question_count ?? 0
      const accuracy = totalQuestions > 0 ? Math.round((p.correct_answers / totalQuestions) * 100) : 0
      return [
        (idx + 1).toString(),
        p.display_name,
        p.score.toString(),
        p.correct_answers.toString(),
        p.wrong_answers.toString(),
        `${accuracy}%`
      ]
    })
    exportToCSV(headers, rows, `${report.session.quiz?.title || 'Quiz'}_Leaderboard`)
  }

  // Export custom fields response
  const handleExportCustomFields = () => {
    if (!report) return
    const headers = ['Participant Name', ...report.customFields.map(f => f.label)]
    const rows = report.participants.map(p => {
      const row = [p.display_name]
      report.customFields.forEach(f => {
        const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
        row.push(resp?.value || '-')
      })
      return row
    })
    exportToCSV(headers, rows, `${report.session.quiz?.title || 'Quiz'}_Registration_Responses`)
  }

  if (loading && !report && sessions.length === 0) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!report ? (
          // SESSIONS LIST VIEW
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
                <p className="text-theme-secondary text-sm">Select a quiz session below to view detailed participants, custom questions & leaderboard data.</p>
              </div>

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
            </div>

            {filteredSessions.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No reports found"
                description={searchQuery ? "Try searching for another keyword" : "Conduct a quiz session to generate reports"}
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map(s => {
                  const theme = getTheme(s.quiz?.theme as never ?? 'modern')
                  const participantCount = (s as unknown as { participants?: [{ count: number }] }).participants?.[0]?.count ?? 0

                  return (
                    <motion.div key={s.id} whileHover={{ y: -3 }} className="cursor-pointer" onClick={() => handleSelectSession(s.id)}>
                      <Card className="h-full flex flex-col justify-between border border-theme hover:border-brand-500/50 transition-colors">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-2xl">{theme.emoji}</span>
                            <Badge variant={s.status === 'completed' ? 'default' : s.status === 'active' ? 'success' : 'warning'}>
                              {s.status}
                            </Badge>
                          </div>

                          <div>
                            <h3 className="font-bold text-theme-primary leading-snug line-clamp-1 mb-1">{s.quiz?.title || 'Quiz'}</h3>
                            <div className="flex items-center gap-2 text-xs text-theme-secondary mb-3">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(s.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-theme flex items-center justify-between">
                          <div className="text-center bg-white/5 px-2.5 py-1 rounded-lg">
                            <span className="text-xs text-theme-secondary block">Room Code</span>
                            <span className="text-base font-black text-theme-primary tracking-wider">{s.room_code}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-400">
                            <Users className="w-4 h-4" />
                            <span>{participantCount} Students</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
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
                  <h1 className="text-2xl font-black text-theme-primary">{report.session.quiz?.title} Report</h1>
                  <p className="text-theme-secondary text-sm flex items-center gap-2 flex-wrap">
                    <span>Room Code: <strong className="text-theme-primary">{report.session.room_code}</strong></span>
                    <span>•</span>
                    <span>Conducted {timeAgo(report.session.created_at)}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {activeTab === 'leaderboard' ? (
                  <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportLeaderboard}>
                    Export Leaderboard
                  </Button>
                ) : (
                  <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCustomFields} disabled={report.customFields.length === 0}>
                    Export Form Responses
                  </Button>
                )}
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

            {/* Tabs */}
            <div className="flex border-b border-theme">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'leaderboard' ? 'border-brand-500 text-brand-400' : 'border-transparent text-theme-secondary hover:text-theme-primary'}`}
              >
                Leaderboard & Scores
              </button>
              <button
                onClick={() => setActiveTab('custom_fields')}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'custom_fields' ? 'border-brand-500 text-brand-400' : 'border-transparent text-theme-secondary hover:text-theme-primary'}`}
              >
                Registration Details ({report.customFields.length})
              </button>
            </div>

            {/* Tab content */}
            <Card>
              {activeTab === 'leaderboard' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-theme text-theme-secondary text-xs font-bold uppercase">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4 text-right">Score</th>
                        <th className="py-3 px-4 text-center">Correct Answers</th>
                        <th className="py-3 px-4 text-center">Wrong Answers</th>
                        <th className="py-3 px-4 text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme/40 text-sm">
                      {report.participants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-theme-secondary">
                            No students attended this session.
                          </td>
                        </tr>
                      ) : (
                        report.participants.map((p, idx) => {
                          const totalQ = report.session.quiz?.question_count ?? 0
                          const accuracy = totalQ > 0 ? Math.round((p.correct_answers / totalQ) * 100) : 0
                          return (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-bold text-theme-primary">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </td>
                              <td className="py-3 px-4 flex items-center gap-3">
                                <Avatar seed={p.avatar_seed} size="xs" />
                                <span className="font-semibold text-theme-primary">{p.display_name}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-theme-primary">{p.score} pts</td>
                              <td className="py-3 px-4 text-center text-success-400 font-semibold">{p.correct_answers}</td>
                              <td className="py-3 px-4 text-center text-danger-400 font-semibold">{p.wrong_answers}</td>
                              <td className="py-3 px-4 text-right">
                                <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 50 ? 'warning' : 'danger'}>
                                  {accuracy}%
                                </Badge>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {report.customFields.length === 0 ? (
                    <div className="text-center py-8 text-theme-secondary">
                      No custom registration fields were configured for this quiz.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-theme text-theme-secondary text-xs font-bold uppercase">
                          <th className="py-3 px-4">Student</th>
                          {report.customFields.map(f => (
                            <th key={f.id} className="py-3 px-4">{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme/40 text-sm">
                        {report.participants.length === 0 ? (
                          <tr>
                            <td colSpan={report.customFields.length + 1} className="text-center py-8 text-theme-secondary">
                              No students registered or attended this session.
                            </td>
                          </tr>
                        ) : (
                          report.participants.map(p => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-theme-primary flex items-center gap-2">
                                <Avatar seed={p.avatar_seed} size="xs" />
                                <span>{p.display_name}</span>
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
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
