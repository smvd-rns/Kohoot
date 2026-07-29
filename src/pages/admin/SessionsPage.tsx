import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Copy, QrCode, Users, Clock, CheckCircle, XCircle, MonitorPlay } from 'lucide-react'
import { Button, Card, Badge, EmptyState, Modal, Select, Avatar, Spinner } from '@/components/ui'
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
  const [creating, setCreating] = useState(false)
  const [qrModal, setQrModal] = useState<QuizSession | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      quizService.listQuizzes(profile.id, profile.role),
      quizService.getAdminSessions(profile.id),
    ]).then(([q, s]) => {
      setQuizzes(q)
      setSessions(s as unknown as QuizSession[])
      // Pre-select the quiz if it's in the URL and exists in the user's quizzes
      const targetQuizId = quizIdFromUrl && q.some(x => x.id === quizIdFromUrl)
        ? quizIdFromUrl
        : (q[0]?.id ?? '')
      setSelectedQuizId(targetQuizId)
      // If a quiz query parameter was passed, automatically open the creation modal
      if (quizIdFromUrl) {
        setCreateModal(true)
      }
    })
      .finally(() => setLoading(false))
  }, [profile?.id, quizIdFromUrl])

  const handleCreate = async () => {
    if (!profile?.id || !selectedQuizId) return
    setCreating(true)
    try {
      const session = await quizService.createSession(selectedQuizId, profile.id)
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

  const statusVariant = (s: string) => s === 'active' ? 'success' : s === 'waiting' ? 'warning' : s === 'completed' ? 'default' : 'default'

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
        <EmptyState icon="▶️" title="No sessions yet" description="Create a session to host a live quiz" action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>Create Session</Button>} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(sessions as Array<QuizSession & { quiz?: { title: string; thumbnail_url?: string; theme?: string }; participants?: [{ count: number }] }>).map((s, i) => {
              const theme = getTheme((s.quiz as { theme?: string })?.theme as never ?? 'modern')
              const participantCount = s.participants?.[0]?.count ?? 0
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card hover>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Theme icon */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: theme.gradient }}>
                        {theme.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-theme-primary truncate">{s.quiz?.title ?? 'Quiz'}</h3>
                          <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-theme-secondary">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participantCount} participants</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(s.created_at)}</span>
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
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          leftIcon={<Copy className="w-4 h-4" />}
                          onClick={() => { copyToClipboard(s.room_code); toast.success('Room code copied!') }}
                        />
                        <Button
                          variant="ghost" size="sm"
                          leftIcon={<QrCode className="w-4 h-4" />}
                          onClick={() => setQrModal(s)}
                        />
                        {s.status !== 'completed' && (
                          <>
                            <Button
                              variant="outline" size="sm"
                              leftIcon={<MonitorPlay className="w-4 h-4" />}
                              onClick={() => window.open(`/admin/sessions/${s.id}/host`, '_blank')}
                            >
                              Host
                            </Button>
                            <Button
                              variant="danger" size="sm"
                              leftIcon={<XCircle className="w-4 h-4" />}
                              onClick={() => handleEndSession(s.id)}
                            >
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
      )}

      {/* Create session modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Start New Session" size="sm">
        <div className="space-y-4">
          <Select
            label="Select Quiz"
            value={selectedQuizId}
            onChange={e => setSelectedQuizId(e.target.value)}
            options={quizzes.map(q => ({ value: q.id, label: q.title }))}
            placeholder="Select a quiz to host..."
          />
          <p className="text-xs text-theme-secondary">A unique room code will be generated. Students can join using this code.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={creating} leftIcon={<Play className="w-4 h-4" />} onClick={handleCreate} disabled={!selectedQuizId}>
              Create Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Share Quiz" size="sm">
        {qrModal && (
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={`${window.location.origin}/student/join?code=${qrModal.room_code}`} size={200} />
            </div>
            <div className="text-center">
              <p className="text-sm text-theme-secondary mb-2">Or share the room code</p>
              <p className="text-4xl font-black text-theme-primary tracking-widest">{qrModal.room_code}</p>
            </div>
            <Button
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={() => { copyToClipboard(qrModal.room_code); toast.success('Copied!') }}
              className="w-full"
            >
              Copy Room Code
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
