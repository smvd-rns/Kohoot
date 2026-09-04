import { useState, useEffect, useMemo } from 'react'
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
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Clock,
  Link2,
} from 'lucide-react'
import { formatDate, timeAgo, getTheme } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { QuizSession, SessionParticipant, CustomField } from '@/types'

type ParticipantWithResponses = SessionParticipant & {
  custom_field_responses?: Array<{ field_id: string; value: string }>
}

type ReportData = {
  session: QuizSession & { quiz?: { title: string; description?: string; thumbnail_url?: string; theme?: string; question_count: number; passing_score: number; max_score?: number } }
  customFields: CustomField[]
  participants: ParticipantWithResponses[]
  quizzes?: Array<{ id: string; title: string; max_score?: number }>
  answers?: any[]
}

type SortConfig = {
  key: string
  direction: 'asc' | 'desc'
}

// Clean a raw field value (strips JSON array brackets from checkbox/gender fields)
function cleanFieldValue(val: string): string {
  if (!val) return ''
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.map((v: string) => v.trim()).join(', ')
  } catch { /* not JSON */ }
  return val.trim()
}

// Format a timestamp nicely
function formatTimestamp(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
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

  // Detail report controls
  const [detailSearch, setDetailSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'score', direction: 'desc' })
  // fieldFilters: { [fieldId]: selectedValue | '' }
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({})

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
    setDetailSearch('')
    setSortConfig({ key: 'score', direction: 'desc' })
    setFieldFilters({})
    setDetailPage(1)
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

  // ── Unique values per dropdown/radio field for filter chips ─────────────────
  const fieldUniqueValues = useMemo(() => {
    if (!report) return {} as Record<string, string[]>
    const result: Record<string, string[]> = {}
    for (const f of report.customFields) {
      if (f.field_type === 'dropdown' || f.field_type === 'radio' || f.field_type === 'checkbox' || f.field_type === 'text') {
        const values = new Set<string>()
        for (const p of report.participants) {
          const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
          if (resp?.value) {
            const cleaned = cleanFieldValue(resp.value)
            if (cleaned) values.add(cleaned)
          }
        }
        const isOptionType = f.field_type === 'dropdown' || f.field_type === 'radio' || f.field_type === 'checkbox'
        if (values.size > 0 && (isOptionType || values.size <= 30)) {
          result[f.id] = Array.from(values).sort()
        }
      }
    }
    return result
  }, [report])

  // ── Filtered + sorted participants ──────────────────────────────────────────
  const filteredParticipants = useMemo(() => {
    if (!report) return []
    let list = [...report.participants]

    // Text search
    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase()
      list = list.filter(p => {
        if (p.display_name.toLowerCase().includes(q)) return true
        for (const resp of p.custom_field_responses ?? []) {
          if (cleanFieldValue(resp.value).toLowerCase().includes(q)) return true
        }
        return false
      })
    }

    // Field value filters (chip filters)
    for (const [fieldId, selectedVal] of Object.entries(fieldFilters)) {
      if (!selectedVal) continue
      list = list.filter(p => {
        const resp = p.custom_field_responses?.find(r => r.field_id === fieldId)
        return cleanFieldValue(resp?.value ?? '') === selectedVal
      })
    }

    // Sort
    const { key, direction } = sortConfig
    list.sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      if (key === 'student') {
        valA = a.display_name.toLowerCase()
        valB = b.display_name.toLowerCase()
      } else if (key === 'score') {
        valA = a.score
        valB = b.score
      } else if (key === 'correct') {
        valA = a.correct_answers
        valB = b.correct_answers
      } else if (key === 'wrong') {
        valA = a.wrong_answers
        valB = b.wrong_answers
      } else if (key === 'accuracy') {
        const totalQ = report.session.quiz?.question_count ?? 1
        valA = totalQ > 0 ? (a.correct_answers / totalQ) * 100 : 0
        valB = totalQ > 0 ? (b.correct_answers / totalQ) * 100 : 0
      } else if (key === 'joined_at') {
        valA = new Date(a.joined_at).getTime()
        valB = new Date(b.joined_at).getTime()
      } else {
        // Custom field ID
        const respA = a.custom_field_responses?.find((r: any) => r.field_id === key)
        const respB = b.custom_field_responses?.find((r: any) => r.field_id === key)
        valA = cleanFieldValue(respA?.value ?? '').toLowerCase()
        valB = cleanFieldValue(respB?.value ?? '').toLowerCase()
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [report, detailSearch, fieldFilters, sortConfig])

  // Active filters count
  const activeFilterCount = Object.values(fieldFilters).filter(Boolean).length

  const clearAllFilters = () => {
    setFieldFilters({})
    setDetailSearch('')
    setSortConfig({ key: 'score', direction: 'desc' })
    setDetailPage(1)
  }

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

  // Total Max Score calculation
  const totalMaxScore = useMemo(() => {
    if (!report) return 0
    if (report.quizzes && report.quizzes.length > 0) {
      return report.quizzes.reduce((sum, q) => sum + (q.max_score || 0), 0)
    }
    return (report.session.quiz as any)?.max_score || (report.session.quiz?.question_count || 0) * 1000
  }, [report])

  // Export unified report — respects active filters
  const handleExportReport = () => {
    if (!report) return
    const customHeaders = report.customFields.map(f => f.label)
    
    const isMultiQuiz = report.quizzes && report.quizzes.length > 1
    const quizHeaders = isMultiQuiz ? report.quizzes!.map(q => `${q.title} Score (Out of ${q.max_score || 0})`) : []
    
    const headers = [
      'Rank', 
      'Participant Name', 
      ...quizHeaders,
      isMultiQuiz ? `Total Score (Out of ${totalMaxScore})` : `Score (Out of ${totalMaxScore})`, 
      'Correct Answers', 
      'Wrong Answers', 
      'Accuracy (%)', 
      'Joined At', 
      ...customHeaders
    ]

    const rows = filteredParticipants.map((p, idx) => {
      const totalQuestions = report.session.quiz?.question_count ?? 0
      const accuracy = totalQuestions > 0 ? Math.round((p.correct_answers / totalQuestions) * 100) : 0
      
      const quizScores = isMultiQuiz ? report.quizzes!.map(quiz => {
        const score = report.answers
          ?.filter(a => a.participant_id === p.id && a.question?.quiz_id === quiz.id)
          ?.reduce((sum, a) => sum + a.points_earned, 0) ?? 0
        return `${score}/${quiz.max_score || 0}`
      }) : []

      const row = [
        (idx + 1).toString(),
        p.display_name,
        ...quizScores,
        `${p.score}/${totalMaxScore}`,
        p.correct_answers.toString(),
        p.wrong_answers.toString(),
        `${accuracy}%`,
        formatTimestamp(p.joined_at),
      ]
      report.customFields.forEach(f => {
        const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
        row.push(cleanFieldValue(resp?.value ?? '') || '-')
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

  // Sort cycle helper
  const cycleSortName = () => {
    setSortConfig(prev => ({
      key: 'student',
      direction: prev.key === 'student' ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }))
    setDetailPage(1)
  }

  if (loading && !report && sessions.length === 0) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  // Paginated detail participants
  const pagedParticipants = filteredParticipants.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize)
  const totalDetailPages = Math.ceil(filteredParticipants.length / detailPageSize) || 1

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
                                    <p className="font-bold text-theme-primary">{s.title || s.quiz?.title || 'Quiz'}</p>
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
                              <td className="px-6 py-4 text-center font-bold text-theme-primary">{participantCount}</td>
                              <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                <Button size="xs" variant="ghost" rightIcon={<ChevronRight className="w-3.5 h-3.5" />} onClick={() => handleSelectSession(s.id)}>
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
                        <select value={sessionsPageSize} onChange={e => { setSessionsPageSize(Number(e.target.value)); setSessionsPage(1) }} className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500">
                          {[10, 30, 50].map(size => <option key={size} value={size} className="bg-neutral-900 text-white">{size}</option>)}
                        </select>
                        <span>entries per page</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-theme-secondary">Page <strong>{sessionsPage}</strong> of <strong>{Math.ceil(filteredSessions.length / sessionsPageSize) || 1}</strong> ({filteredSessions.length} entries)</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSessionsPage(p => Math.max(1, p - 1))} disabled={sessionsPage === 1}>Previous</Button>
                          <Button variant="outline" size="sm" onClick={() => setSessionsPage(p => Math.min(Math.ceil(filteredSessions.length / sessionsPageSize), p + 1))} disabled={sessionsPage === Math.ceil(filteredSessions.length / sessionsPageSize) || Math.ceil(filteredSessions.length / sessionsPageSize) === 0}>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            ) : (
              // ALL TIME LEADERBOARD TABLE
              allTimeLeaderboard.length === 0 ? (
                <EmptyState icon="🏆" title="No registered student data found" description="Scores will appear here when registered students submit answers in your quiz sessions." />
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
                            <td className="px-6 py-4 text-center font-semibold text-theme-secondary">{p.sessions}</td>
                            <td className="px-6 py-4 text-right font-bold text-theme-primary">{p.total_score} pts</td>
                            <td className="px-6 py-4 text-right text-brand-400 font-semibold">{p.avg_score} pts</td>
                            <td className="px-6 py-4 text-right text-theme-secondary">{p.best_score} pts</td>
                            <td className="px-6 py-4 text-center text-success-400 font-bold">{p.total_correct}</td>
                            <td className="px-6 py-4 text-center text-danger-400 font-bold">{p.total_wrong}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {allTimeLeaderboard.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
                      <div className="flex items-center gap-2 text-sm text-theme-secondary">
                        <span>Show</span>
                        <select value={allTimePageSize} onChange={e => { setAllTimePageSize(Number(e.target.value)); setAllTimePage(1) }} className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500">
                          {[10, 30, 50].map(size => <option key={size} value={size} className="bg-neutral-900 text-white">{size}</option>)}
                        </select>
                        <span>entries per page</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-theme-secondary">Page <strong>{allTimePage}</strong> of <strong>{Math.ceil(allTimeLeaderboard.length / allTimePageSize) || 1}</strong> ({allTimeLeaderboard.length} entries)</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAllTimePage(p => Math.max(1, p - 1))} disabled={allTimePage === 1}>Previous</Button>
                          <Button variant="outline" size="sm" onClick={() => setAllTimePage(p => Math.min(Math.ceil(allTimeLeaderboard.length / allTimePageSize), p + 1))} disabled={allTimePage === Math.ceil(allTimeLeaderboard.length / allTimePageSize) || Math.ceil(allTimeLeaderboard.length / allTimePageSize) === 0}>Next</Button>
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-theme-primary">{report.session.title || report.session.quiz?.title} Report</h1>
                    <Badge variant={report.session.mode === 'self_paced' ? 'warning' : 'info'}>
                      {report.session.mode === 'self_paced' ? '📋 Self-Paced' : '🎮 Live'}
                    </Badge>
                  </div>
                  <p className="text-theme-secondary text-sm flex items-center gap-2 flex-wrap mt-0.5">
                    <span>Room Code: <strong className="text-theme-primary">{report.session.room_code}</strong></span>
                    <span>•</span>
                    <span>Conducted {timeAgo(report.session.created_at)}</span>
                  </p>
                  {report.session.custom_link_enabled && report.session.custom_link_url && (
                    <div className="mt-2 inline-flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl font-medium">
                      <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Custom Link: <a href={report.session.custom_link_url.startsWith('http') ? report.session.custom_link_url : `https://${report.session.custom_link_url}`} target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-emerald-200">{report.session.custom_link_label || 'Join Group'}</a> ({report.session.custom_link_url})</span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportReport}>
                Export {activeFilterCount > 0 ? `(Filtered)` : 'CSV'}
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-6 h-6" style={{ color: '#00f0ff' }} />} label="Participants" value={report.participants.length} color="rgba(0,240,255,0.15)" />
              <StatCard icon={<Trophy className="w-6 h-6" style={{ color: '#ffd700' }} />} label="Average Score"
                value={`${report.participants.length > 0 ? Math.round(report.participants.reduce((acc, p) => acc + p.score, 0) / report.participants.length) : 0} pts`}
                color="rgba(255,215,0,0.15)" />
              <StatCard icon={<CheckCircle2 className="w-6 h-6" style={{ color: '#22c55e' }} />} label="Passing Rate"
                value={`${report.participants.length > 0 ? Math.round((report.participants.filter(p => {
                  const totalQ = report.session.quiz?.question_count ?? 1
                  return (p.correct_answers / totalQ) * 100 >= (report.session.quiz?.passing_score ?? 60)
                }).length / report.participants.length) * 100) : 0}%`}
                color="rgba(34,197,94,0.15)" />
              <StatCard icon={<Award className="w-6 h-6" style={{ color: '#f928b8' }} />} label="Top Scorer" value={report.participants[0]?.display_name || '-'} color="rgba(249,40,184,0.15)" />
            </div>

            {/* ── Search, Sort & Filters bar ─────────────────────────────────── */}
            <Card>
              <div className="space-y-4">
                {/* Row 1: Search + Sort */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-secondary" />
                    <input
                      type="text"
                      placeholder="Search by name, email, college..."
                      value={detailSearch}
                      onChange={e => { setDetailSearch(e.target.value); setDetailPage(1) }}
                      className="input-field pl-10 w-full"
                    />
                    {detailSearch && (
                      <button onClick={() => { setDetailSearch(''); setDetailPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2 shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-theme-secondary" />
                    <span className="text-xs text-theme-secondary font-semibold">Sort:</span>
                    <button
                      onClick={() => { setSortConfig({ key: 'score', direction: 'desc' }); setDetailPage(1) }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'score' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                    >
                      <Trophy className="w-3 h-3" /> Score
                    </button>
                    <button
                      onClick={() => { cycleSortName(); setDetailPage(1) }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'student' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                    >
                      {sortConfig.key === 'student' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
                      A–Z
                    </button>
                    <button
                      onClick={() => { setSortConfig({ key: 'joined_at', direction: 'asc' }); setDetailPage(1) }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'joined_at' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                    >
                      <Clock className="w-3 h-3" /> Time
                    </button>
                  </div>

                  {/* Clear all */}
                  {(activeFilterCount > 0 || detailSearch || sortConfig.key !== 'score') && (
                    <button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 transition-all shrink-0">
                      <X className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>

                {/* Row 2: Smart filter dropdowns — one per filterable field */}
                {Object.keys(fieldUniqueValues).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-theme-secondary shrink-0">Filter:</span>
                    {Object.entries(fieldUniqueValues).map(([fieldId, values]) => {
                      const field = report.customFields.find(f => f.id === fieldId)
                      if (!field || values.length === 0) return null
                      const activeVal = fieldFilters[fieldId] || ''
                      const count = activeVal
                        ? report.participants.filter(p => {
                            const resp = p.custom_field_responses?.find(r => r.field_id === fieldId)
                            return cleanFieldValue(resp?.value ?? '') === activeVal
                          }).length
                        : null
                      return (
                        <div key={fieldId} className="relative group">
                          <select
                            value={activeVal}
                            onChange={e => { setFieldFilters(prev => ({ ...prev, [fieldId]: e.target.value })); setDetailPage(1) }}
                            className={`
                              appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold
                              border transition-all cursor-pointer outline-none
                              bg-white/5 hover:bg-white/10
                              ${activeVal
                                ? 'border-brand-500 text-brand-300 ring-1 ring-brand-500/40 bg-brand-500/10'
                                : 'border-white/10 text-theme-secondary hover:border-white/20'
                              }
                            `}
                          >
                            <option value="" className="bg-neutral-900 text-white">
                              {field.label} — All ({report.participants.length})
                            </option>
                            {values.map(val => {
                              const c = report.participants.filter(p => {
                                const resp = p.custom_field_responses?.find(r => r.field_id === fieldId)
                                return cleanFieldValue(resp?.value ?? '') === val
                              }).length
                              return (
                                <option key={val} value={val} className="bg-neutral-900 text-white">
                                  {val} ({c})
                                </option>
                              )
                            })}
                          </select>
                          {/* Custom dropdown arrow */}
                          <div className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${activeVal ? 'text-brand-400' : 'text-theme-secondary'}`}>
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          {/* Active badge */}
                          {activeVal && count !== null && (
                            <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg">
                              {count}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Active filter summary */}
                {(filteredParticipants.length !== report.participants.length) && (
                  <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold bg-brand-500/10 px-3 py-2 rounded-lg">
                    <Search className="w-3.5 h-3.5" />
                    Showing {filteredParticipants.length} of {report.participants.length} students
                    {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                  </div>
                )}
              </div>
            </Card>


            {/* ── Main Table ──────────────────────────────────────────────────── */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-theme text-theme-secondary text-xs font-bold uppercase select-none">
                      <th className="py-3 px-4">Rank</th>
                      {(() => {
                        const renderSortHeader = (key: string, label: string, align: 'left' | 'center' | 'right' = 'left') => {
                          const isSorted = sortConfig.key === key
                          const isAsc = sortConfig.direction === 'asc'
                          const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                          return (
                            <th 
                              className={`py-3 px-4 cursor-pointer hover:text-brand-400 transition-colors ${alignClass}`}
                              onClick={() => {
                                setSortConfig(prev => ({
                                  key,
                                  direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'desc'
                                }))
                                setDetailPage(1)
                              }}
                            >
                              <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                <span>{label}</span>
                                <span className={`text-[10px] ${isSorted ? 'text-brand-400 font-extrabold' : 'text-white/20'}`}>
                                  {isSorted ? (isAsc ? '▲' : '▼') : '▲▼'}
                                </span>
                              </div>
                            </th>
                          )
                        }

                        const isMultiQuiz = report.quizzes && report.quizzes.length > 1
                        return (
                          <>
                            {renderSortHeader('student', 'Student')}
                            {isMultiQuiz && report.quizzes?.map(q => (
                              <th key={q.id} className="py-3 px-4 text-right select-none text-theme-secondary text-xs font-bold uppercase">
                                <span title={q.title}>
                                  {q.title.length > 12 ? q.title.slice(0, 12) + '...' : q.title}
                                  {q.max_score ? ` (/${q.max_score})` : ''}
                                </span>
                              </th>
                            ))}
                            {renderSortHeader('score', isMultiQuiz ? `Total Score${totalMaxScore > 0 ? ` (/${totalMaxScore})` : ''}` : `Score${totalMaxScore > 0 ? ` (/${totalMaxScore})` : ''}`, 'right')}
                            {renderSortHeader('correct', 'Correct', 'center')}
                            {renderSortHeader('wrong', 'Wrong', 'center')}
                            {renderSortHeader('accuracy', 'Accuracy', 'right')}
                            {renderSortHeader('joined_at', 'Joined At')}
                            {report.customFields.map(f => renderSortHeader(f.id, f.label))}
                          </>
                        )
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme/40 text-sm">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7 + report.customFields.length + (report.quizzes && report.quizzes.length > 1 ? report.quizzes.length : 0)} className="text-center py-12 text-theme-secondary">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-30" />
                            <p className="font-semibold">No students match your search</p>
                            <button onClick={clearAllFilters} className="text-brand-400 text-xs underline">Clear filters</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedParticipants.map((p, idx) => {
                        const globalIdx = (detailPage - 1) * detailPageSize + idx
                        // Use global rank from original sorted-by-score list
                        const originalRank = report.participants.findIndex(op => op.id === p.id)
                        const totalQ = report.session.quiz?.question_count ?? 0
                        const accuracy = totalQ > 0 ? Math.round((p.correct_answers / totalQ) * 100) : 0
                        const rankLabel = originalRank === 0 ? '🥇' : originalRank === 1 ? '🥈' : originalRank === 2 ? '🥉' : `#${originalRank + 1}`

                        return (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-bold text-theme-primary">{rankLabel}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar seed={p.avatar_seed} size="xs" />
                                <span className="font-semibold text-theme-primary">{p.display_name}</span>
                              </div>
                            </td>
                            {report.quizzes && report.quizzes.length > 1 && report.quizzes.map(quiz => {
                              const score = report.answers
                                ?.filter(a => a.participant_id === p.id && a.question?.quiz_id === quiz.id)
                                ?.reduce((sum, a) => sum + a.points_earned, 0) ?? 0
                              return (
                                <td key={quiz.id} className="py-3 px-4 text-right font-semibold text-brand-400">
                                  {score} / {quiz.max_score || 0} pts
                                </td>
                              )
                            })}
                            <td className="py-3 px-4 text-right font-bold text-theme-primary">
                              {p.score}{totalMaxScore > 0 ? ` / ${totalMaxScore}` : ''} pts
                            </td>
                            <td className="py-3 px-4 text-center text-success-400 font-semibold">{p.correct_answers}</td>
                            <td className="py-3 px-4 text-center text-danger-400 font-semibold">{p.wrong_answers}</td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 50 ? 'warning' : 'danger'}>{accuracy}%</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-theme-secondary text-xs font-medium">{formatTimestamp(p.joined_at)}</span>
                                <span className="text-white/30 text-[10px]">{timeAgo(p.joined_at)}</span>
                              </div>
                            </td>
                            {report.customFields.map(f => {
                              const resp = p.custom_field_responses?.find(r => r.field_id === f.id)
                              const val = cleanFieldValue(resp?.value ?? '')
                              const isFilterActive = fieldFilters[f.id] && fieldFilters[f.id] === val
                              return (
                                <td key={f.id} className="py-3 px-4">
                                  {val
                                    ? <span
                                        onClick={() => { if (fieldUniqueValues[f.id]) { setFieldFilters(prev => ({ ...prev, [f.id]: prev[f.id] === val ? '' : val })); setDetailPage(1) } }}
                                        className={`inline-block font-medium text-theme-secondary transition-all ${fieldUniqueValues[f.id] ? 'cursor-pointer hover:text-brand-400' : ''} ${isFilterActive ? 'text-brand-400' : ''}`}
                                        title={fieldUniqueValues[f.id] ? `Click to filter by "${val}"` : undefined}
                                      >
                                        {val}
                                      </span>
                                    : <span className="text-white/20 italic text-xs">Not filled</span>
                                  }
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

              {/* Pagination */}
              {filteredParticipants.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
                  <div className="flex items-center gap-2 text-sm text-theme-secondary">
                    <span>Show</span>
                    <select value={detailPageSize} onChange={e => { setDetailPageSize(Number(e.target.value)); setDetailPage(1) }} className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500">
                      {[10, 30, 50].map(size => <option key={size} value={size} className="bg-neutral-900 text-white">{size}</option>)}
                    </select>
                    <span>entries per page</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-theme-secondary">
                      Page <strong>{detailPage}</strong> of <strong>{totalDetailPages}</strong> ({filteredParticipants.length} entries)
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetailPage(p => Math.max(1, p - 1))} disabled={detailPage === 1}>Previous</Button>
                      <Button variant="outline" size="sm" onClick={() => setDetailPage(p => Math.min(totalDetailPages, p + 1))} disabled={detailPage === totalDetailPages || totalDetailPages === 0}>Next</Button>
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
