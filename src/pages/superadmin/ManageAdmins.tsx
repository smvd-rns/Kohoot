import { useEffect, useState } from 'react'
import { Card, Avatar, Badge, EmptyState, Spinner, Button, StatCard } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDate, timeAgo } from '@/lib/utils'
import type { Profile, Quiz } from '@/types'
import toast from 'react-hot-toast'
import { quizService } from '@/services/quiz.service'
import { studentService } from '@/services/student.service'
import { BookOpen, Play, Users, BarChart3, ArrowLeft, Download, CheckCircle2, Award } from 'lucide-react'

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
    quizService.getSessionReport(selectedSessionId).then(data => {
      setReport(data)
    }).catch(err => {
      console.error(err)
      toast.error('Failed to load session report.')
    }).finally(() => {
      setLoadingReport(false)
    })
  }, [selectedSessionId])

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

  const handleExportReport = () => {
    if (!report) return
    const customHeaders = report.customFields?.map((f: any) => f.label) ?? []
    const headers = ['Rank', 'Participant Name', 'Score', 'Correct Answers', 'Wrong Answers', 'Accuracy (%)', ...customHeaders]
    
    const rows = report.participants.map((p: any, idx: number) => {
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
      
      report.customFields?.forEach((f: any) => {
        const resp = p.custom_field_responses?.find((r: any) => r.field_id === f.id)
        row.push(resp?.value || '-')
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
              Export CSV
            </Button>
          )}
        </div>

        {loadingReport || !report ? (
          <Card><div className="flex justify-center py-20"><Spinner /></div></Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-6 h-6 text-cyan-400" />} label="Participants" value={report.participants.length} color="rgba(6,182,212,0.1)" />
              <StatCard icon={<Award className="w-6 h-6 text-yellow-400" />} label="Average Score" value={`${report.participants.length > 0 ? Math.round(report.participants.reduce((acc: number, p: any) => acc + p.score, 0) / report.participants.length) : 0} pts`} color="rgba(234,179,8,0.1)" />
              <StatCard
                icon={<CheckCircle2 className="w-6 h-6 text-green-400" />}
                label="Passing Rate"
                value={`${
                  report.participants.length > 0
                    ? Math.round(
                        (report.participants.filter((p: any) => {
                          const totalQ = report.session.quiz?.question_count ?? 1
                          const scorePercent = (p.correct_answers / totalQ) * 100
                          return scorePercent >= (report.session.quiz?.passing_score ?? 60)
                        }).length /
                          report.participants.length) *
                          100
                      )
                    : 0
                }%`}
                color="rgba(34,197,94,0.1)"
              />
              <StatCard icon={<Award className="w-6 h-6 text-pink-400" />} label="Top Scorer" value={report.participants[0]?.display_name || '-'} color="rgba(249,40,184,0.1)" />
            </div>

            <Card padding="none">
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
                      {report.customFields?.map((f: any) => (
                        <th key={f.id} className="py-3 px-4 min-w-[120px]">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme/40 text-sm">
                    {report.participants.length === 0 ? (
                      <tr>
                        <td colSpan={6 + (report.customFields?.length ?? 0)} className="text-center py-8 text-theme-secondary">
                          No students attended this session.
                        </td>
                      </tr>
                    ) : (
                      report.participants.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize).map((p: any, idx: number) => {
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
                            {report.customFields?.map((f: any) => {
                              const resp = p.custom_field_responses?.find((r: any) => r.field_id === f.id)
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-theme">
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
                    <th className="px-4 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {students.map(st => (
                    <tr key={st.id} className="hover:bg-white/3">
                      <td className="px-4 py-3 font-semibold text-theme-primary">{st.display_name}</td>
                      <td className="px-4 py-3 text-theme-secondary">{st.email}</td>
                      <td className="px-4 py-3 text-theme-secondary">@{st.username}</td>
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
