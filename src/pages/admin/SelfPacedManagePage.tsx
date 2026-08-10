import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Clock, CheckCircle, XCircle, BarChart2, ArrowLeft, Copy, QrCode } from 'lucide-react'
import { Button, Avatar, Card, Badge, Spinner, Modal } from '@/components/ui'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { copyToClipboard, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { QuizSession, SessionParticipant, Question } from '@/types'

// ── Countdown to deadline ─────────────────────────────────────────────────────
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState('')
  const [pct, setPct] = useState(100)
  useEffect(() => {
    const deadlineMs = new Date(deadline).getTime()
    const update = () => {
      const diff = deadlineMs - Date.now()
      if (diff <= 0) { setRemaining('Deadline passed'); setPct(0); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`)
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`)
      else setRemaining(`${m}m ${s}s`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [deadline])
  const isUrgent = new Date(deadline).getTime() - Date.now() < 3600000
  return (
    <div className={cn('glass rounded-2xl p-4 text-center', isUrgent && 'border border-danger-500/40')}>
      <p className="text-xs text-theme-secondary mb-1 flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" /> Time Remaining
      </p>
      <p className={cn('text-2xl font-black', isUrgent ? 'text-danger-400' : 'text-theme-primary')}>{remaining}</p>
      <p className="text-xs text-theme-secondary mt-1">Deadline: {new Date(deadline).toLocaleString()}</p>
    </div>
  )
}

export default function SelfPacedManagePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [qrModal, setQrModal] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      const s = await quizService.getSession(sessionId)
      setSession(s as unknown as QuizSession)
      const qs = await quizService.getQuestions(s.quiz_id)
      setQuestions(qs)
      const { data: parts } = await supabase.from('session_participants').select('*').eq('session_id', sessionId).order('score', { ascending: false })
      if (parts) setParticipants(parts as SessionParticipant[])
    } finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Real-time: new participants joining
  useEffect(() => {
    if (!sessionId) return
    const ch = supabase.channel(`sp-manage-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, payload => {
        setParticipants(prev => [payload.new as SessionParticipant, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, payload => {
        setParticipants(prev => prev.map(p => p.id === (payload.new as SessionParticipant).id ? { ...p, ...payload.new as SessionParticipant } : p))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId])

  const handleEndSession = async () => {
    if (!session) return
    setEnding(true)
    try {
      await quizService.updateSessionStatus(session.id, 'completed')
      toast.success('Session closed. Students can no longer submit answers.')
      navigate('/admin/sessions')
    } catch { toast.error('Failed to close session') } finally { setEnding(false) }
  }

  if (loading || !session) {
    return <div className="flex h-[80vh] items-center justify-center"><Spinner size="lg" /></div>
  }

  const totalQ = questions.length
  const finished = participants.filter(p => p.is_finished).length
  const joinUrl = `${window.location.origin}/student/join?code=${session.room_code}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/admin/sessions')}>
            Sessions
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-theme-primary">{(session as any).quiz?.title ?? 'Self-Paced Quiz'}</h1>
              <Badge variant="warning">📋 Self-Paced</Badge>
              <Badge variant={session.status === 'completed' ? 'default' : 'success'}>
                {session.status === 'completed' ? 'Closed' : 'Open'}
              </Badge>
            </div>
            <p className="text-sm text-theme-secondary">Room Code: <strong className="text-theme-primary tracking-widest">{session.room_code}</strong></p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" leftIcon={<QrCode className="w-4 h-4" />} onClick={() => setQrModal(true)}>QR Code</Button>
          <Button variant="ghost" size="sm" leftIcon={<Copy className="w-4 h-4" />} onClick={() => { copyToClipboard(session.room_code); toast.success('Copied!') }}>Copy Code</Button>
          {session.status !== 'completed' && (
            <Button variant="danger" size="sm" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => setConfirmEnd(true)}>Close Session</Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-black text-theme-primary">{participants.length}</p>
          <p className="text-xs text-theme-secondary mt-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Students Joined</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black text-success-400">{finished}</p>
          <p className="text-xs text-theme-secondary mt-1 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black text-warning-400">{participants.length - finished}</p>
          <p className="text-xs text-theme-secondary mt-1 flex items-center justify-center gap-1"><BarChart2 className="w-3 h-3" /> In Progress</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black text-theme-primary">{totalQ}</p>
          <p className="text-xs text-theme-secondary mt-1">Questions</p>
        </Card>
      </div>

      {/* Deadline countdown */}
      {session.deadline && <DeadlineCountdown deadline={session.deadline} />}

      {/* Student progress list */}
      <Card padding="none">
        <div className="p-6 border-b border-theme">
          <h2 className="text-lg font-bold text-theme-primary">Student Progress</h2>
        </div>
        {participants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-5xl mb-3">👀</p>
            <p className="text-theme-secondary">No students have joined yet.</p>
            <p className="text-xs text-theme-secondary mt-1">Share the room code or QR code for students to join.</p>
          </div>
        ) : (
          <div className="divide-y divide-theme">
            <AnimatePresence>
              {participants.map((p, i) => {
                const progress = totalQ > 0 ? Math.round((p.student_question_index / totalQ) * 100) : 0
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
                    <Avatar seed={p.avatar_seed} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-medium text-theme-primary truncate">{p.display_name}</p>
                        {p.is_finished
                          ? <Badge variant="success">✓ Done</Badge>
                          : <Badge variant="warning">Q {p.student_question_index + 1} of {totalQ}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className={cn('h-1.5 rounded-full', p.is_finished ? 'bg-success-500' : 'bg-brand-500')}
                            initial={{ width: 0 }}
                            animate={{ width: `${p.is_finished ? 100 : progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-xs text-theme-secondary w-8 text-right">{p.is_finished ? 100 : progress}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-brand-400">{p.score.toLocaleString()}</p>
                      <p className="text-xs text-theme-secondary">pts</p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* QR Modal */}
      <Modal open={qrModal} onClose={() => setQrModal(false)} title="Share Quiz" size="sm">
        <div className="flex flex-col items-center gap-6">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>
          <div className="text-center">
            <p className="text-sm text-theme-secondary mb-2">Room Code</p>
            <p className="text-4xl font-black text-theme-primary tracking-widest">{session.room_code}</p>
          </div>
          <Button leftIcon={<Copy className="w-4 h-4" />} onClick={() => { copyToClipboard(session.room_code); toast.success('Copied!') }} className="w-full">
            Copy Room Code
          </Button>
        </div>
      </Modal>

      {/* Confirm end modal */}
      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Close Session?">
        <p className="text-theme-secondary mb-6">
          Closing this session will prevent any new or ongoing submissions. Students who haven't finished will not be able to continue.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setConfirmEnd(false)}>Cancel</Button>
          <Button variant="danger" isLoading={ending} leftIcon={<XCircle className="w-4 h-4" />} onClick={handleEndSession}>
            Close Session
          </Button>
        </div>
      </Modal>
    </div>
  )
}
