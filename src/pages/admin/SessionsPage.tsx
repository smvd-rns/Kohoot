import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Copy, QrCode, Users, Clock, XCircle, MonitorPlay, BookOpen, Link2, Pencil } from 'lucide-react'
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

  // Multi-quiz states
  const [isMultiQuiz, setIsMultiQuiz] = useState(false)
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([])
  const [transitionMessages, setTransitionMessages] = useState<string[]>([])
  const [sessionTitle, setSessionTitle] = useState('')

  // Edit session states
  const [editSessionModal, setEditSessionModal] = useState<QuizSession | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [deadlineModalSession, setDeadlineModalSession] = useState<QuizSession | null>(null)
  const [editDeadlineVal, setEditDeadlineVal] = useState('')
  const [updatingDeadline, setUpdatingDeadline] = useState(false)

  const handleOpenCreateModal = () => {
    setSessionTitle('')
    setSessionMode('live')
    setParticipantMode('any')
    setDeadline('')
    setIsMultiQuiz(false)
    const publishedQuizzes = quizzes.filter(x => x.is_published)
    const defaultQ = quizIdFromUrl && quizzes.some(x => x.id === quizIdFromUrl)
      ? quizIdFromUrl
      : (publishedQuizzes[0]?.id ?? '')
    setSelectedQuizId(defaultQ)
    setSelectedQuizIds(defaultQ ? [defaultQ] : [])
    setTransitionMessages([])
    setCreateModal(true)
  }

  const handleOpenEditModal = (s: QuizSession) => {
    setEditSessionModal(s)
    setSessionTitle(s.title || '')
    setSessionMode(s.mode ?? 'live')
    setParticipantMode(s.participant_mode ?? 'any')
    if (s.deadline) {
      const d = new Date(s.deadline)
      const tzOffset = d.getTimezoneOffset() * 60000
      setDeadline(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16))
    } else {
      setDeadline('')
    }

    if (s.quiz_ids && s.quiz_ids.length > 1) {
      setIsMultiQuiz(true)
      setSelectedQuizIds(s.quiz_ids)
      setTransitionMessages(s.transition_messages ?? [])
      setSelectedQuizId(s.quiz_ids[0])
    } else {
      setIsMultiQuiz(false)
      setSelectedQuizIds(s.quiz_ids || (s.quiz_id ? [s.quiz_id] : []))
      setTransitionMessages([])
      setSelectedQuizId(s.quiz_id || (s.quiz_ids?.[0] ?? ''))
    }
  }

  const handleSaveEdit = async () => {
    if (!editSessionModal) return
    const quizId = isMultiQuiz ? selectedQuizIds[0] : selectedQuizId
    if (!quizId) {
      toast.error('Please select at least one quiz')
      return
    }
    if (sessionMode === 'self_paced' && !deadline) {
      toast.error('Please set a deadline for self-paced mode')
      return
    }
    setSavingEdit(true)
    try {
      const updated = await quizService.updateSessionDetails(editSessionModal.id, {
        title: sessionTitle.trim() || undefined,
        quizId,
        quizIds: isMultiQuiz ? selectedQuizIds : [selectedQuizId],
        transitionMessages: isMultiQuiz ? transitionMessages : [],
        mode: sessionMode,
        participantMode,
        deadline: sessionMode === 'self_paced' && deadline ? new Date(deadline).toISOString() : null,
      })
      setSessions(prev => prev.map(x => x.id === editSessionModal.id ? { ...x, ...updated } : x))
      setEditSessionModal(null)
      toast.success('Session updated! Room code & QR code preserved.')
    } catch {
      toast.error('Failed to update session')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleOpenDeadlineModal = (s: QuizSession) => {
    setDeadlineModalSession(s)
    if (s.deadline) {
      const d = new Date(s.deadline)
      const tzOffset = d.getTimezoneOffset() * 60000
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
      setEditDeadlineVal(localISOTime)
    } else {
      setEditDeadlineVal('')
    }
  }

  const handleUpdateDeadline = async () => {
    if (!deadlineModalSession) return
    if (!editDeadlineVal) {
      toast.error('Please set a valid deadline')
      return
    }
    setUpdatingDeadline(true)
    try {
      const updatedDl = new Date(editDeadlineVal).toISOString()
      const updatedSession = await quizService.updateSessionDeadline(deadlineModalSession.id, updatedDl)
      setSessions(prev => prev.map(x => x.id === deadlineModalSession.id ? { ...x, ...updatedSession } : x))
      setDeadlineModalSession(null)
      toast.success('Deadline updated successfully!')
    } catch {
      toast.error('Failed to update deadline')
    } finally {
      setUpdatingDeadline(false)
    }
  }

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      quizService.listQuizzes(profile.id, profile.role),
      quizService.getAdminSessions(profile.id),
    ]).then(([q, s]) => {
      setQuizzes(q)
      setSessions(s as unknown as QuizSession[])
      const publishedQuizzes = q.filter(x => x.is_published)
      const targetQuizId = quizIdFromUrl && q.some(x => x.id === quizIdFromUrl)
        ? quizIdFromUrl
        : (publishedQuizzes[0]?.id ?? '')
      setSelectedQuizId(targetQuizId)
      if (quizIdFromUrl) setCreateModal(true)
    }).finally(() => setLoading(false))
  }, [profile?.id, quizIdFromUrl])

  const handleCreate = async () => {
    if (!profile?.id) return
    const quizId = isMultiQuiz ? selectedQuizIds[0] : selectedQuizId
    if (!quizId) {
      toast.error('Please select at least one quiz')
      return
    }
    if (sessionMode === 'self_paced' && !deadline) {
      toast.error('Please set a deadline for self-paced mode')
      return
    }
    setCreating(true)
    try {
      const session = await quizService.createSession(quizId, profile.id, {
        mode: sessionMode,
        deadline: sessionMode === 'self_paced' ? new Date(deadline).toISOString() : undefined,
        participantMode: participantMode,
        quizIds: isMultiQuiz ? selectedQuizIds : [selectedQuizId],
        transitionMessages: isMultiQuiz ? transitionMessages : [],
        title: sessionTitle.trim() || undefined,
      })
      setSessions(s => [session as unknown as QuizSession, ...s])
      setCreateModal(false)
      setSessionTitle('')
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
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Info & Theme Icon */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: theme.gradient }}>
                          {isSelfPaced ? '📋' : theme.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-theme-primary truncate text-base">{s.title || s.quiz?.title || 'Quiz'}</h3>
                            <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                            {isSelfPaced && <Badge variant="warning">📋 Self-Paced</Badge>}
                            {s.participant_mode === 'registered_only' && <Badge variant="danger">🔒 Registered Only</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-theme-secondary">
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-theme-secondary/80" />{participantCount} participants</span>
                            <span className="text-theme-secondary/40">•</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-theme-secondary/80" />{timeAgo(s.created_at)}</span>
                            {isSelfPaced && s.deadline && (
                              <>
                                <span className="text-theme-secondary/40">•</span>
                                <span className="flex items-center gap-1 text-warning-400 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-warning-500/80" />
                                  <span>Deadline: {new Date(s.deadline).toLocaleDateString()} {new Date(s.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Room Code & Actions */}
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-shrink-0">
                        {/* Room code */}
                        <div className="glass px-4 py-2 rounded-xl text-center min-w-[120px]">
                          <p className="text-[10px] uppercase tracking-wider text-theme-secondary font-bold mb-0.5">Room Code</p>
                          <p className="text-xl font-black text-theme-primary tracking-widest">{s.room_code}</p>
                        </div>

                        {/* Actions group */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Share & Tool actions */}
                          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 gap-0.5">
                            <Button variant="ghost" size="sm" className="p-2 h-9 w-9" leftIcon={<Link2 className="w-4 h-4" />}
                              onClick={() => {
                                copyToClipboard(`${window.location.origin}/student/join?code=${s.room_code}`)
                                toast.success('Join link copied!')
                              }}
                              title="Copy join link"
                            />
                            <Button variant="ghost" size="sm" className="p-2 h-9 w-9" leftIcon={<Copy className="w-4 h-4" />}
                              onClick={() => { copyToClipboard(s.room_code); toast.success('Room code copied!') }}
                              title="Copy room code"
                            />
                            <Button variant="ghost" size="sm" className="p-2 h-9 w-9" leftIcon={<QrCode className="w-4 h-4" />}
                              onClick={() => setQrModal(s)}
                              title="Show QR Code"
                            />
                            <Button variant="ghost" size="sm" className="p-2 h-9 w-9 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10" leftIcon={<Pencil className="w-4 h-4" />}
                              onClick={() => handleOpenEditModal(s)}
                              title="Edit Session (Keep Room & QR Code)"
                            />
                            {isSelfPaced && (
                              <Button variant="ghost" size="sm" className="p-2 h-9 w-9 text-theme-primary hover:text-theme-primary" leftIcon={<Clock className="w-4 h-4" />}
                                onClick={() => handleOpenDeadlineModal(s)}
                                title="Edit Deadline"
                              />
                            )}
                            {s.status !== 'completed' && (
                              <Button variant="ghost" size="sm" className="p-2 h-9 w-9 text-danger-400 hover:text-danger-500 hover:bg-danger-500/10" leftIcon={<XCircle className="w-4 h-4" />}
                                onClick={() => handleEndSession(s.id)}
                                title="End Session"
                              />
                            )}
                          </div>

                          {/* Primary action */}
                          {isActive && (
                            isSelfPaced ? (
                              <Button variant="outline" size="sm" className="h-9 px-4 font-semibold" leftIcon={<BookOpen className="w-4 h-4" />}
                                onClick={() => window.open(`/admin/sessions/${s.id}/self-paced`, '_blank')}>
                                Monitor
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-9 px-4 font-semibold" leftIcon={<MonitorPlay className="w-4 h-4" />}
                                onClick={() => window.open(`/admin/sessions/${s.id}/host`, '_blank')}>
                                Host
                              </Button>
                            )
                          )}
                        </div>
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
          <Input
            label="Session Name (Optional)"
            placeholder="e.g. Midterm Quiz - Section A"
            value={sessionTitle}
            onChange={e => setSessionTitle(e.target.value)}
          />

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-theme-secondary font-bold hover:text-theme-primary transition-colors">
              <input
                type="checkbox"
                checked={isMultiQuiz}
                onChange={e => {
                  const checked = e.target.checked
                  setIsMultiQuiz(checked)
                  if (checked) {
                    setSelectedQuizIds(selectedQuizId ? [selectedQuizId] : [])
                    setTransitionMessages([])
                  } else {
                    setSelectedQuizId(selectedQuizIds[0] ?? '')
                  }
                }}
                className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              Conduct Multi-Quiz Event (Sequential Play)
            </label>
          </div>

          {!isMultiQuiz ? (
            <Select
              label="Select Quiz"
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
              options={quizzes.filter(q => q.is_published).map(q => ({ value: q.id, label: q.title }))}
              placeholder="Select a quiz..."
            />
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label-text block mb-1.5 font-bold">Select Quizzes (In order of play)</label>
                <div className="max-h-40 overflow-y-auto space-y-2 glass p-3 rounded-xl border border-theme">
                  {quizzes.filter(q => q.is_published).map(q => {
                    const isChecked = selectedQuizIds.includes(q.id)
                    const idx = selectedQuizIds.indexOf(q.id)
                    return (
                      <label key={q.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors text-sm text-theme-primary font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedQuizIds(prev => prev.filter(id => id !== q.id))
                              setTransitionMessages(prev => prev.slice(0, -1))
                            } else {
                              setSelectedQuizIds(prev => [...prev, q.id])
                              setTransitionMessages(prev => [...prev, ''])
                            }
                          }}
                          className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 w-4 h-4"
                        />
                        <span>{q.title}</span>
                        {isChecked && (
                          <span className="ml-auto bg-brand-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">
                            Quiz #{idx + 1}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {selectedQuizIds.slice(0, -1).map((qid, idx) => {
                const q = quizzes.find(x => x.id === qid)
                return (
                  <div key={qid} className="space-y-1">
                    <label className="label-text block text-xs text-theme-secondary font-bold">
                      Transition Message after "{q?.title}" (Quiz #{idx + 1})
                    </label>
                    <input
                      type="text"
                      value={transitionMessages[idx] ?? ''}
                      onChange={e => {
                        const next = [...transitionMessages]
                        next[idx] = e.target.value
                        setTransitionMessages(next)
                      }}
                      placeholder="e.g. Great job! Next up is the Math round. Get ready!"
                      className="input-field w-full text-xs"
                    />
                  </div>
                )
              })}
            </div>
          )}

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
              onClick={handleCreate} disabled={isMultiQuiz ? selectedQuizIds.length === 0 : !selectedQuizId}>
              {sessionMode === 'live' ? 'Create Session' : 'Assign Quiz'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit session modal */}
      <Modal open={!!editSessionModal} onClose={() => setEditSessionModal(null)} title={`Edit Session (Room: ${editSessionModal?.room_code})`} size="sm">
        {editSessionModal && (
          <div className="space-y-4">
            <Input
              label="Session Name (Optional)"
              placeholder="e.g. Midterm Quiz - Section A"
              value={sessionTitle}
              onChange={e => setSessionTitle(e.target.value)}
            />

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-theme-secondary font-bold hover:text-theme-primary transition-colors">
                <input
                  type="checkbox"
                  checked={isMultiQuiz}
                  onChange={e => {
                    const checked = e.target.checked
                    setIsMultiQuiz(checked)
                    if (checked) {
                      setSelectedQuizIds(selectedQuizId ? [selectedQuizId] : [])
                      setTransitionMessages([])
                    } else {
                      setSelectedQuizId(selectedQuizIds[0] ?? '')
                    }
                  }}
                  className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 w-4 h-4"
                />
                Conduct Multi-Quiz Event (Sequential Play)
              </label>
            </div>

            {!isMultiQuiz ? (
              <Select
                label="Select Quiz"
                value={selectedQuizId}
                onChange={e => setSelectedQuizId(e.target.value)}
                options={quizzes.filter(q => q.is_published).map(q => ({ value: q.id, label: q.title }))}
                placeholder="Select a quiz..."
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label-text block mb-1.5 font-bold">Select Quizzes (In order of play)</label>
                  <div className="max-h-40 overflow-y-auto space-y-2 glass p-3 rounded-xl border border-theme">
                    {quizzes.filter(q => q.is_published).map(q => {
                      const isChecked = selectedQuizIds.includes(q.id)
                      const idx = selectedQuizIds.indexOf(q.id)
                      return (
                        <label key={q.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors text-sm text-theme-primary font-medium">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedQuizIds(prev => prev.filter(id => id !== q.id))
                                setTransitionMessages(prev => prev.slice(0, -1))
                              } else {
                                setSelectedQuizIds(prev => [...prev, q.id])
                                setTransitionMessages(prev => [...prev, ''])
                              }
                            }}
                            className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 w-4 h-4"
                          />
                          <span>{q.title}</span>
                          {isChecked && (
                            <span className="ml-auto bg-brand-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">
                              Quiz #{idx + 1}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>

                {selectedQuizIds.slice(0, -1).map((qid, idx) => {
                  const q = quizzes.find(x => x.id === qid)
                  return (
                    <div key={qid} className="space-y-1">
                      <label className="label-text block text-xs text-theme-secondary font-bold">
                        Transition Message after "{q?.title}" (Quiz #{idx + 1})
                      </label>
                      <input
                        type="text"
                        value={transitionMessages[idx] ?? ''}
                        onChange={e => {
                          const next = [...transitionMessages]
                          next[idx] = e.target.value
                          setTransitionMessages(next)
                        }}
                        placeholder="e.g. Great job! Next up is the Math round. Get ready!"
                        className="input-field w-full text-xs"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mode selector */}
            <div>
              <label className="label-text block mb-2 font-bold">Quiz Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'live', label: '🎮 Live', desc: 'Host controls the quiz in real-time' },
                  { value: 'self_paced', label: '📋 Self-Paced', desc: 'Students take it anytime before deadline' },
                ] as const).map(m => (
                  <button key={m.value} type="button" onClick={() => setSessionMode(m.value)}
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
                <label className="label-text block mb-1.5 font-bold">Deadline</label>
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

            <p className="text-xs text-brand-400 font-semibold bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/20">
              ⚡ Room Code <strong>{editSessionModal.room_code}</strong> and QR Code remain unchanged.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditSessionModal(null)}>Cancel</Button>
              <Button className="flex-1" isLoading={savingEdit}
                leftIcon={<Pencil className="w-4 h-4" />}
                onClick={handleSaveEdit} disabled={isMultiQuiz ? selectedQuizIds.length === 0 : !selectedQuizId}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
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

      {/* Edit Deadline modal */}
      <Modal open={!!deadlineModalSession} onClose={() => setDeadlineModalSession(null)} title="Edit Session Deadline" size="sm">
        {deadlineModalSession && (
          <div className="space-y-4">
            <div>
              <label className="label-text block mb-1.5 font-bold">New Deadline</label>
              <input
                type="datetime-local"
                value={editDeadlineVal}
                onChange={e => setEditDeadlineVal(e.target.value)}
                className="input-field w-full"
              />
              <p className="text-xs text-theme-secondary mt-1">
                You can extend the deadline. Students will be able to play/resume until this time.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeadlineModalSession(null)}>Cancel</Button>
              <Button className="flex-1" isLoading={updatingDeadline} onClick={handleUpdateDeadline}>
                Save Deadline
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
