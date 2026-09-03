import { useEffect, useState, useMemo } from 'react'
import { Card, Avatar, Badge, EmptyState, Spinner, Button, StatCard } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDate, timeAgo } from '@/lib/utils'
import type { Profile, Quiz } from '@/types'
import toast from 'react-hot-toast'
import { quizService } from '@/services/quiz.service'
import { studentService } from '@/services/student.service'
import { BookOpen, Play, Users, BarChart3, ArrowLeft, Download, CheckCircle2, Award, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, X, Clock, Trophy } from 'lucide-react'

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inspectingAdmin, setInspectingAdmin] = useState<Profile | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
    setAdmins((data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id)
      if (error) throw error
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, is_approved: !currentStatus } : a))
      if (inspectingAdmin && inspectingAdmin.id === id) {
        setInspectingAdmin(prev => prev ? { ...prev, is_approved: !currentStatus } : null)
      }
      toast.success(currentStatus ? 'Admin account suspended.' : 'Admin account approved successfully!')
    } catch {
      toast.error('Failed to update admin status.')
    }
  }

  if (inspectingAdmin) {
    return (
      <AdminActivityView
        admin={inspectingAdmin}
        onBack={() => setInspectingAdmin(null)}
        onToggleApproval={handleToggleApproval}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">Manage Admins</h1>
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : admins.length === 0 ? (
          <EmptyState icon="🛡️" title="No admins yet" description="Admins who register will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-white/3 text-sm">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar seed={a.avatar_seed} size="sm" />
                        <span className="font-semibold text-theme-primary">{a.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-secondary">{a.email}</td>
                    <td className="px-4 py-3 text-theme-secondary">@{a.username}</td>
                    <td className="px-4 py-3 text-theme-secondary">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={a.is_approved ? 'success' : 'warning'}>
                        {a.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setInspectingAdmin(a)}
                        >
                          View Activity
                        </Button>
                        <Button
                          size="xs"
                          variant={a.is_approved ? 'danger' : 'success'}
                          onClick={() => handleToggleApproval(a.id, a.is_approved)}
                        >
                          {a.is_approved ? 'Suspend' : 'Approve'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

interface AdminActivityViewProps {
  admin: Profile
  onBack: () => void
  onToggleApproval: (id: string, currentStatus: boolean) => Promise<void>
}

function AdminActivityView({ admin, onBack, onToggleApproval }: AdminActivityViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'sessions' | 'students'>('overview')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Session Report details
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [report, setReport] = useState<any | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(10)
  // Report filters/sort
  const [detailSearch, setDetailSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' })
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    Promise.all([
      quizService.listQuizzes(admin.id),
      quizService.getAdminSessions(admin.id),
      studentService.listStudents(admin.id)
    ]).then(([q, s, st]) => {
      setQuizzes(q)
      setSessions(s)
      setStudents(st)
    }).catch(err => {
      console.error(err)
      toast.error('Failed to load admin activity.')
    }).finally(() => {
      setLoading(false)
    })
  }, [admin.id])

  useEffect(() => {
    if (!selectedSessionId) {
      setReport(null)
      return
    }
    setLoadingReport(true)
    setDetailSearch('')
    setSortConfig({ key: 'score', direction: 'desc' })
    setFieldFilters({})
    setDetailPage(1)
    quizService.getSessionReport(selectedSessionId).then(data => {
      setReport(data)
    }).catch(err => {
      console.error(err)
      toast.error('Failed to load session report.')
    }).finally(() => {
      setLoadingReport(false)
    })
  }, [selectedSessionId])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const cleanFieldValue = (val: string): string => {
    if (!val) return ''
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.map((v: string) => v.trim()).join(', ')
    } catch { /* not JSON */ }
    return val.trim()
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  }

  const fieldUniqueValues = useMemo(() => {
    if (!report) return {} as Record<string, string[]>
    const result: Record<string, string[]> = {}
    for (const f of report.customFields ?? []) {
      const values = new Set<string>()
      for (const p of report.participants) {
        const resp = p.custom_field_responses?.find((r: any) => r.field_id === f.id)
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
    return result
  }, [report])

  const filteredParticipants = useMemo(() => {
    if (!report) return []
    let list = [...report.participants]
    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase()
      list = list.filter((p: any) => {
        if (p.display_name.toLowerCase().includes(q)) return true
        for (const resp of p.custom_field_responses ?? []) {
          if (cleanFieldValue(resp.value).toLowerCase().includes(q)) return true
        }
        return false
      })
    }
    for (const [fieldId, selectedVal] of Object.entries(fieldFilters)) {
      if (!selectedVal) continue
      list = list.filter((p: any) => {
        const resp = p.custom_field_responses?.find((r: any) => r.field_id === fieldId)
        return cleanFieldValue(resp?.value ?? '') === selectedVal
      })
    }
    
    const { key, direction } = sortConfig
    list.sort((a: any, b: any) => {
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

  const activeFilterCount = Object.values(fieldFilters).filter(Boolean).length

  const clearAllFilters = () => {
    setFieldFilters({})
    setDetailSearch('')
    setSortConfig({ key: 'score', direction: 'desc' })
    setDetailPage(1)
  }

  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report exported successfully!')
  }

  const totalMaxScore = useMemo(() => {
    if (!report) return 0
    if (report.quizzes && report.quizzes.length > 0) {
      return report.quizzes.reduce((sum: number, q: any) => sum + (q.max_score || 0), 0)
    }
    return report.session.quiz?.max_score || (report.session.quiz?.question_count || 0) * 1000
  }, [report])

  const handleExportReport = () => {
    if (!report) return
    const customHeaders = report.customFields?.map((f: any) => f.label) ?? []
    const isMultiQuiz = report.quizzes && report.quizzes.length > 1
    const quizHeaders = isMultiQuiz ? report.quizzes.map((q: any) => `${q.title} Score (Out of ${q.max_score || 0})`) : []
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
    const rows = filteredParticipants.map((p: any, idx: number) => {
      const totalQuestions = report.session.quiz?.question_count ?? 0
      const accuracy = totalQuestions > 0 ? Math.round((p.correct_answers / totalQuestions) * 100) : 0
      const quizScores = isMultiQuiz ? report.quizzes.map((quiz: any) => {
        const score = report.answers
          ?.filter((a: any) => a.participant_id === p.id && a.question?.quiz_id === quiz.id)
          ?.reduce((sum: number, a: any) => sum + a.points_earned, 0) ?? 0
        return `${score}/${quiz.max_score || 0}`
      }) : []
      const row = [
        (idx + 1).toString(), p.display_name, ...quizScores, `${p.score}/${totalMaxScore}`,
        p.correct_answers.toString(), p.wrong_answers.toString(), `${accuracy}%`,
        formatTimestamp(p.joined_at),
      ]
      report.customFields?.forEach((f: any) => {
        const resp = p.custom_field_responses?.find((r: any) => r.field_id === f.id)
        row.push(cleanFieldValue(resp?.value ?? '') || '-')
      })
      return row
    })
    exportToCSV(headers, rows, `${report.session.quiz?.title || 'Quiz'}`)
  }

  const totalPlays = sessions.reduce((acc, s) => acc + (s.participants?.[0]?.count ?? 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-theme-primary">Admin Activity</h1>
        </div>
        <Card>
          <div className="flex justify-center py-20"><Spinner /></div>
        </Card>
      </div>
    )
  }

  if (selectedSessionId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSessionId(null)} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {report && (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-theme-primary">{report.session.quiz?.title} Report</h1>
                  <Badge variant={report.session.mode === 'self_paced' ? 'warning' : 'purple'}>
                    {report.session.mode === 'self_paced' ? '📋 Self-Paced' : '🎮 Live'}
                  </Badge>
                </div>
                <p className="text-theme-secondary text-sm flex items-center gap-2 flex-wrap mt-0.5">
                  <span>Room Code: <strong className="text-theme-primary">{report.session.room_code}</strong></span>
                  <span>•</span>
                  <span>Conducted {timeAgo(report.session.created_at)}</span>
                </p>
              </div>
            )}
          </div>
          {report && (
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportReport}>
              Export {activeFilterCount > 0 ? '(Filtered)' : 'CSV'}
            </Button>
          )}
        </div>

        {loadingReport || !report ? (
          <Card><div className="flex justify-center py-20"><Spinner /></div></Card>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-6 h-6 text-cyan-400" />} label="Participants" value={report.participants.length} color="rgba(6,182,212,0.1)" />
              <StatCard icon={<Award className="w-6 h-6 text-yellow-400" />} label="Average Score" value={`${report.participants.length > 0 ? Math.round(report.participants.reduce((acc: number, p: any) => acc + p.score, 0) / report.participants.length) : 0} pts`} color="rgba(234,179,8,0.1)" />
              <StatCard
                icon={<CheckCircle2 className="w-6 h-6 text-green-400" />}
                label="Passing Rate"
                value={`${report.participants.length > 0 ? Math.round((report.participants.filter((p: any) => {
                  const totalQ = report.session.quiz?.question_count ?? 1
                  return (p.correct_answers / totalQ) * 100 >= (report.session.quiz?.passing_score ?? 60)
                }).length / report.participants.length) * 100) : 0}%`}
                color="rgba(34,197,94,0.1)"
              />
              <StatCard icon={<Award className="w-6 h-6 text-pink-400" />} label="Top Scorer" value={report.participants[0]?.display_name || '-'} color="rgba(249,40,184,0.1)" />
            </div>

            {/* Search, Sort & Filter bar */}
            <Card>
              <div className="space-y-4">
                {/* Row 1: Search + Sort */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-theme-secondary" />
                    <span className="text-xs text-theme-secondary font-semibold">Sort:</span>
                    <button onClick={() => { setSortConfig({ key: 'score', direction: 'desc' }); setDetailPage(1) }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'score' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}>
                      <Trophy className="w-3 h-3" /> Score
                    </button>
                    <button onClick={() => { 
                      setSortConfig(prev => ({
                        key: 'student',
                        direction: prev.key === 'student' ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
                      }));
                      setDetailPage(1);
                    }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'student' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}>
                      {sortConfig.key === 'student' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />} A–Z
                    </button>
                    <button onClick={() => { setSortConfig({ key: 'joined_at', direction: 'asc' }); setDetailPage(1) }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'joined_at' ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40' : 'bg-white/5 text-theme-secondary hover:text-theme-primary'}`}>
                      <Clock className="w-3 h-3" /> Time
                    </button>
                  </div>
                  {(activeFilterCount > 0 || detailSearch || sortConfig.key !== 'score') && (
                    <button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 transition-all shrink-0">
                      <X className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>

                {/* Smart filter dropdowns — one per filterable field */}
                {Object.keys(fieldUniqueValues).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-theme-secondary shrink-0">Filter:</span>
                    {Object.entries(fieldUniqueValues).map(([fieldId, values]) => {
                      const field = report.customFields?.find((f: any) => f.id === fieldId)
                      if (!field || (values as string[]).length === 0) return null
                      const activeVal = fieldFilters[fieldId] || ''
                      const count = activeVal
                        ? report.participants.filter((p: any) => {
                            const resp = p.custom_field_responses?.find((r: any) => r.field_id === fieldId)
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
                            {(values as string[]).map((val: string) => {
                              const c = report.participants.filter((p: any) => {
                                const resp = p.custom_field_responses?.find((r: any) => r.field_id === fieldId)
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

                {filteredParticipants.length !== report.participants.length && (
                  <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold bg-brand-500/10 px-3 py-2 rounded-lg">
                    <Search className="w-3.5 h-3.5" />
                    Showing {filteredParticipants.length} of {report.participants.length} students
                    {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                  </div>
                )}
              </div>
            </Card>

            {/* Main table */}
            <Card padding="none">
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
                            {isMultiQuiz && report.quizzes?.map((q: any) => (
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
                            {report.customFields?.map((f: any) => renderSortHeader(f.id, f.label))}
                          </>
                        )
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme/40 text-sm">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7 + (report.customFields?.length ?? 0) + (report.quizzes && report.quizzes.length > 1 ? report.quizzes.length : 0)} className="text-center py-12 text-theme-secondary">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-30" />
                            <p className="font-semibold">No students match your search</p>
                            <button onClick={clearAllFilters} className="text-brand-400 text-xs underline">Clear filters</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize).map((p: any, idx: number) => {
                        const originalRank = report.participants.findIndex((op: any) => op.id === p.id)
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
                            {report.quizzes && report.quizzes.length > 1 && report.quizzes.map((quiz: any) => {
                              const score = report.answers
                                ?.filter((a: any) => a.participant_id === p.id && a.question?.quiz_id === quiz.id)
                                ?.reduce((sum: number, a: any) => sum + a.points_earned, 0) ?? 0
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
                            {report.customFields?.map((f: any) => {
                              const resp = p.custom_field_responses?.find((r: any) => r.field_id === f.id)
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

              {filteredParticipants.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-theme">
                  <div className="flex items-center gap-2 text-sm text-theme-secondary">
                    <span>Show</span>
                    <select value={detailPageSize} onChange={e => { setDetailPageSize(Number(e.target.value)); setDetailPage(1) }} className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500">
                      {[10, 30, 50].map(size => <option key={size} value={size} className="bg-neutral-900 text-white">{size}</option>)}
                    </select>
                    <span>entries per page</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-theme-secondary">Page <strong>{detailPage}</strong> of <strong>{Math.ceil(filteredParticipants.length / detailPageSize) || 1}</strong> ({filteredParticipants.length} entries)</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetailPage(p => Math.max(1, p - 1))} disabled={detailPage === 1}>Previous</Button>
                      <Button variant="outline" size="sm" onClick={() => setDetailPage(p => Math.min(Math.ceil(filteredParticipants.length / detailPageSize), p + 1))} disabled={detailPage === Math.ceil(filteredParticipants.length / detailPageSize) || Math.ceil(filteredParticipants.length / detailPageSize) === 0}>Next</Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-theme-primary">Admin: {admin.display_name}</h1>
            <p className="text-theme-secondary text-sm">@{admin.username} · {admin.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={admin.is_approved ? 'danger' : 'success'}
            onClick={() => onToggleApproval(admin.id, admin.is_approved)}
          >
            {admin.is_approved ? 'Suspend Admin' : 'Approve Admin'}
          </Button>
        </div>
      </div>

      <div className="flex border-b border-theme gap-4">
        {(['overview', 'quizzes', 'sessions', 'students'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BookOpen className="w-6 h-6 text-brand-400" />} label="Quizzes Created" value={quizzes.length} color="rgba(124,111,239,0.1)" />
          <StatCard icon={<Play className="w-6 h-6 text-green-400" />} label="Sessions Hosted" value={sessions.length} color="rgba(34,197,94,0.1)" />
          <StatCard icon={<Users className="w-6 h-6 text-pink-400" />} label="Unique Students" value={students.length} color="rgba(249,40,184,0.1)" />
          <StatCard icon={<BarChart3 className="w-6 h-6 text-cyan-400" />} label="Total Participations" value={totalPlays} color="rgba(6,182,212,0.1)" />
        </div>
      )}

      {activeTab === 'quizzes' && (
        <Card padding="none">
          {quizzes.length === 0 ? (
            <EmptyState icon="📝" title="No quizzes created" description="This admin has not created any quizzes yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                    <th className="px-4 py-3">Quiz Title</th>
                    <th className="px-4 py-3">Questions</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {quizzes.map(q => (
                    <tr key={q.id} className="hover:bg-white/3">
                      <td className="px-4 py-3 font-medium text-theme-primary">{q.title}</td>
                      <td className="px-4 py-3 text-theme-secondary">{q.question_count ?? q.questions?.length ?? 0} questions</td>
                      <td className="px-4 py-3 text-theme-secondary">{formatDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'sessions' && (
        <Card padding="none">
          {sessions.length === 0 ? (
            <EmptyState icon="🎮" title="No sessions hosted" description="This admin has not hosted any sessions yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                    <th className="px-4 py-3">Quiz</th>
                    <th className="px-4 py-3">Room Code</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Players</th>
                    <th className="px-4 py-3">Hosted</th>
                    <th className="px-4 py-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-white/3">
                      <td className="px-4 py-3 font-medium text-theme-primary">{s.quiz?.title ?? 'Unknown Quiz'}</td>
                      <td className="px-4 py-3 font-mono text-brand-400 font-bold">{s.room_code}</td>
                      <td className="px-4 py-3 text-theme-secondary capitalize">{s.mode?.replace('_', ' ') ?? 'live'}</td>
                      <td className="px-4 py-3 text-theme-secondary capitalize">
                        <Badge variant={s.status === 'completed' ? 'success' : s.status === 'active' ? 'purple' : 'warning'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">{s.participants?.[0]?.count ?? 0} players</td>
                      <td className="px-4 py-3 text-theme-secondary">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setSelectedSessionId(s.id)}
                        >
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'students' && (
        <Card padding="none">
          {students.length === 0 ? (
            <EmptyState icon="👥" title="No students" description="No students have played this admin's quizzes yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {students.map(st => (
                    <tr key={st.id} className="hover:bg-white/3">
                      <td className="px-4 py-3 font-semibold text-theme-primary">{st.display_name}</td>
                      <td className="px-4 py-3 text-theme-secondary">{st.email}</td>
                      <td className="px-4 py-3 text-theme-secondary">@{st.username}</td>
                      <td className="px-4 py-3 text-theme-secondary">{st.phone || <span className="text-white/20 italic">Not filled</span>}</td>
                      <td className="px-4 py-3 text-theme-secondary">{formatDate(st.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
