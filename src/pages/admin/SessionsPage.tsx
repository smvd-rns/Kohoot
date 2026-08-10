import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Copy, QrCode, Users, Clock, XCircle, MonitorPlay, BookOpen, Link2 } from 'lucide-react'
import { Button, Card, Badge, EmptyState, Modal, Select, Avatar, Spinner, Input } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { quizService } from '@/services/quiz.service'
import { useSearchParams } from 'react-router-dom'
import { copyToClipboard, formatDate, timeAgo, getTheme } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import type { Quiz, QuizSession } from '@/types'

export default function SessionsPage() {
  const { profile } = useAuthStore()
  const [searchParams] = useSearchParams()
  const quizIdFromUrl = searchParams.get('quiz')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [sessionMode, setSessionMode] = useState<'live' | 'self_paced'>('live')
  const [participantMode, setParticipantMode] = useState<'any' | 'registered_only'>('any')
  const [deadline, setDeadline] = useState('')
  const [creating, setCreating] = useState(false)
  const [qrModal, setQrModal] = useState<QuizSession | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      quizService.listQuizzes(profile.id, profile.role),
      quizService.getAdminSessions(profile.id),
    ]).then(([q, s]) => {
      setQuizzes(q)
      setSessions(s as unknown as QuizSession[])
      const targetQuizId = quizIdFromUrl && q.some(x => x.id === quizIdFromUrl)
        ? quizIdFromUrl
        : (q[0]?.id ?? '')
      setSelectedQuizId(targetQuizId)
      if (quizIdFromUrl) setCreateModal(true)
    }).finally(() => setLoading(false))
  }, [profile?.id, quizIdFromUrl])

  const handleCreate = async () => {
    if (!profile?.id || !selectedQuizId) return
    if (sessionMode === 'self_paced' && !deadline) {
      toast.error('Please set a deadline for self-paced mode')
      return
    }
    setCreating(true)
    try {
      const session = await quizService.createSession(selectedQuizId, profile.id, {
        mode: sessionMode,
        deadline: sessionMode === 'self_paced' ? new Date(deadline).toISOString() : undefined,
        participantMode: participantMode,
      })
      setSessions(s => [session as unknown as QuizSession, ...s])
      setCreateModal(false)
      toast.success(`Session created! Room code: ${session.room_code}`)
    } catch { toast.error('Failed to create session') } finally { setCreating(false) }
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      await quizService.updateSessionStatus(sessionId, 'completed')
      setSessions(s => s.map(x => x.id === sessionId ? { ...x, status: 'completed' } : x))
      toast.success('Session ended')
    } catch { toast.error('Failed to end session') }
  }

  const statusVariant = (s: string) =>
    s === 'active' ? 'success' : s === 'waiting' ? 'warning' : s === 'self_paced' ? 'info' : 'default'

  const statusLabel = (s: string) =>
    s === 'self_paced' ? 'Open' : s

  // Min datetime string for deadline input (now + 5 min)
  const minDeadline = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-theme-primary">Sessions</h1>
          <p className="text-theme-secondary text-sm">{sessions.length} sessions total</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>New Session</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <EmptyState icon="▶️" title="No sessions yet" description="Create a session to host a live or self-paced quiz"
          action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>Create Session</Button>} />
      ) : (
        <div className="space-y-3">
          <div className="space-y-3">
            <AnimatePresence>
              {(sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize) as Array<QuizSession & { quiz?: { title: string; thumbnail_url?: string; theme?: string }; participants?: [{ count: number }] }>).map((s, i) => {
                const theme = getTheme((s.quiz as { theme?: string })?.theme as never ?? 'modern')
                const participantCount = s.participants?.[0]?.count ?? 0
                const isSelfPaced = s.mode === 'self_paced'
                const isActive = s.status !== 'completed'
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card hover>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Theme icon */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: theme.gradient }}>
                        {isSelfPaced ? '📋' : theme.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-theme-primary truncate">{s.quiz?.title ?? 'Quiz'}</h3>
                          <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                          {isSelfPaced && <Badge variant="warning">📋 Self-Paced</Badge>}
                          {s.participant_mode === 'registered_only' && <Badge variant="danger">🔒 Registered Only</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-theme-secondary">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participantCount} participants</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(s.created_at)}</span>
                          {isSelfPaced && s.deadline && (
                            <span className="flex items-center gap-1 text-warning-400">
                              <Clock className="w-3 h-3" />Deadline: {new Date(s.deadline).toLocaleDateString()} {new Date(s.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Room code */}
                      <div className="flex items-center gap-3">
                        <div className="glass px-4 py-2 rounded-xl text-center">
                          <p className="text-xs text-theme-secondary mb-0.5">Room Code</p>
                          <p className="text-2xl font-black text-theme-primary tracking-widest">{s.room_code}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        <Button variant="ghost" size="sm" leftIcon={<Link2 className="w-4 h-4" />}
                          onClick={() => {
                            copyToClipboard(`${window.location.origin}/student/join?code=${s.room_code}`)
                            toast.success('Join link copied!')
                          }}
                          title="Copy join link"
                        >
                          Copy Link
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Copy className="w-4 h-4" />}
                          onClick={() => { copyToClipboard(s.room_code); toast.success('Room code copied!') }}
                          title="Copy room code"
                        />
                        <Button variant="ghost" size="sm" leftIcon={<QrCode className="w-4 h-4" />}
                          onClick={() => setQrModal(s)} />
                        {isActive && (
                          <>
                            {isSelfPaced ? (
                              <Button variant="outline" size="sm" leftIcon={<BookOpen className="w-4 h-4" />}
                                onClick={() => window.open(`/admin/sessions/${s.id}/self-paced`, '_blank')}>
                                Monitor
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" leftIcon={<MonitorPlay className="w-4 h-4" />}
                                onClick={() => window.open(`/admin/sessions/${s.id}/host`, '_blank')}>
                                Host
                              </Button>
                            )}
                            <Button variant="danger" size="sm" leftIcon={<XCircle className="w-4 h-4" />}
                              onClick={() => handleEndSession(s.id)}>
                              End
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {sessions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-theme">
              <div className="flex items-center gap-2 text-sm text-theme-secondary">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
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
                  Page <strong>{currentPage}</strong> of <strong>{Math.ceil(sessions.length / pageSize) || 1}</strong> ({sessions.length} entries)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sessions.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(sessions.length / pageSize) || Math.ceil(sessions.length / pageSize) === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create session modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Session" size="sm">
        <div className="space-y-4">
          <Select
            label="Select Quiz"
            value={selectedQuizId}
            onChange={e => setSelectedQuizId(e.target.value)}
            options={quizzes.map(q => ({ value: q.id, label: q.title }))}
            placeholder="Select a quiz..."
          />

          {/* Mode selector */}
          <div>
            <label className="label-text block mb-2">Quiz Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'live', label: '🎮 Live', desc: 'Host controls the quiz in real-time' },
                { value: 'self_paced', label: '📋 Self-Paced', desc: 'Students take it anytime before deadline' },
              ] as const).map(m => (
                <button key={m.value} onClick={() => setSessionMode(m.value)}
                  className={`p-3 rounded-xl text-left transition-all border ${sessionMode === m.value ? 'border-brand-500 bg-brand-500/10' : 'border-theme glass hover:bg-white/5'}`}>
                  <p className="font-bold text-sm text-theme-primary">{m.label}</p>
                  <p className="text-xs text-theme-secondary mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Participant Mode Selector */}
          <div>
            <label className="label-text block mb-2 font-bold">Allowed Participants</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'any', label: '👤 Open to All', desc: 'Guests & registered users can join' },
                { value: 'registered_only', label: '🔒 Registered Only', desc: 'Real account login is strictly required' },
              ] as const).map(pm => (
                <button key={pm.value} type="button" onClick={() => setParticipantMode(pm.value)}
                  className={`p-3 rounded-xl text-left transition-all border ${participantMode === pm.value ? 'border-brand-500 bg-brand-500/10' : 'border-theme glass hover:bg-white/5'}`}>
                  <p className="font-bold text-sm text-theme-primary">{pm.label}</p>
                  <p className="text-xs text-theme-secondary mt-0.5">{pm.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {sessionMode === 'self_paced' && (
            <div>
              <label className="label-text block mb-1.5">Deadline</label>
              <input
                type="datetime-local"
                min={minDeadline}
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="input-field w-full"
              />
              <p className="text-xs text-theme-secondary mt-1">Students won't be able to submit after this time.</p>
            </div>
          )}

          <p className="text-xs text-theme-secondary">A unique room code will be generated. Students join using this code.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={creating}
              leftIcon={sessionMode === 'live' ? <Play className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              onClick={handleCreate} disabled={!selectedQuizId}>
              {sessionMode === 'live' ? 'Create Session' : 'Assign Quiz'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Share Quiz" size="sm">
        {qrModal && (
          <div className="flex flex-col items-center gap-5">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={`${window.location.origin}/student/join?code=${qrModal.room_code}`} size={200} />
            </div>
            <div className="text-center">
              <p className="text-xs text-theme-secondary mb-1">Room Code</p>
              <p className="text-4xl font-black text-theme-primary tracking-widest">{qrModal.room_code}</p>
            </div>

            {/* Full link display */}
            <div className="w-full glass rounded-xl px-4 py-3 flex items-center gap-3">
              <Link2 className="w-4 h-4 text-theme-secondary flex-shrink-0" />
              <p className="text-xs text-theme-secondary truncate flex-1 font-mono">
                {window.location.origin}/student/join?code={qrModal.room_code}
              </p>
            </div>

            {/* Two action buttons */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                leftIcon={<Copy className="w-4 h-4" />}
                onClick={() => { copyToClipboard(qrModal.room_code); toast.success('Room code copied!') }}
                className="flex-1"
              >
                Copy Code
              </Button>
              <Button
                leftIcon={<Link2 className="w-4 h-4" />}
                onClick={() => {
                  copyToClipboard(`${window.location.origin}/student/join?code=${qrModal.room_code}`)
                  toast.success('Join link copied!')
                }}
                className="flex-1"
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
