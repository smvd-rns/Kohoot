import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Clock, Wifi } from 'lucide-react'
import { Avatar, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { useAuthStore } from '@/store/authStore'
import type { QuizSession, SessionParticipant } from '@/types'

export default function QuizLobbyPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState('.')
  const [musicUrl, setMusicUrl] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Sync audio state directly to the DOM node to bypass React race conditions
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted && musicUrl) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, musicUrl]);

  // Animate waiting dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
    return () => clearInterval(t)
  }, [])

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const s = await quizService.getSession(sessionId)
      setSession(s as unknown as QuizSession)
      setParticipants((s.participants ?? []) as unknown as SessionParticipant[])
      
      if (s.quiz?.background_music_url) {
        setMusicUrl(s.quiz.background_music_url)
      } else {
        import('@/lib/music').then(m => setMusicUrl(m.BACKGROUND_MUSIC[1].url))
      }

      // If session already active, go to play
      if (s.status === 'active') navigate(`/quiz/play/${sessionId}`)
      if (s.status === 'completed') navigate(`/quiz/results/${sessionId}`)
    } finally { setLoading(false) }
  }, [sessionId, navigate])

  useEffect(() => { loadSession() }, [loadSession])

  // Realtime subscription for session status & new participants
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`lobby-${sessionId}`)

    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        const updated = payload.new as QuizSession
        setSession(updated)
        
        if (updated.status === 'active') {
          // If admin started the quiz, redirect immediately
          navigate(`/student/play/${sessionId}`, { replace: true })
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, (payload) => {
        setParticipants(prev => [...prev, payload.new as any])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, navigate])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const quiz = (session as unknown as { quiz?: { title: string; question_count?: number } })?.quiz

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}

      {/* Music controls for Student */}
      <div className="absolute top-4 right-4 z-50">
        <button onClick={() => {
          const nextMuted = !isMuted
          setIsMuted(nextMuted)
          if (audioRef.current) audioRef.current.play().catch(console.error)
        }} className="p-2 glass rounded-full hover:bg-white/10 transition-colors shadow-lg">
          {isMuted ? <span className="text-red-400">🔇</span> : <span className="text-green-400">🔊</span>}
        </button>
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: 200 + i * 50,
              height: 200 + i * 50,
              background: i % 2 === 0 ? 'var(--color-accent-1)' : 'var(--color-accent-2)',
              top: `${20 + i * 12}%`,
              left: `${10 + i * 15}%`,
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-12 pb-6 px-4">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Wifi className="w-4 h-4 text-success-400 animate-pulse" />
            <span className="text-sm font-medium text-success-400">Connected</span>
          </div>
          <h1 className="text-4xl font-black text-theme-primary mb-2">{quiz?.title ?? 'Quiz Lobby'}</h1>
          <p className="text-theme-secondary">{quiz?.question_count ?? 0} questions · Waiting for host to start{dots}</p>
        </motion.div>

        {/* Room code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-block glass-strong rounded-2xl px-8 py-4 mt-6"
        >
          <p className="text-sm text-theme-secondary mb-1">Room Code</p>
          <p className="text-5xl font-black text-theme-primary tracking-widest" style={{ color: 'var(--color-accent-1)' }}>
            {session?.room_code}
          </p>
        </motion.div>
      </div>

      {/* Participants */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-5 h-5 text-theme-secondary" />
            <span className="text-theme-secondary font-medium">{participants.length} joined</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <AnimatePresence mode="popLayout">
              {participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.03 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    <Avatar seed={p.avatar_seed} size="lg" border />
                    {p.student_id === profile?.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                        ★
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-theme-primary max-w-16 truncate text-center">{p.display_name}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {participants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-theme-secondary">Waiting for participants to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 glass border-t border-theme p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
          <p className="text-sm text-theme-secondary">Waiting for host to start the quiz</p>
          <Clock className="w-4 h-4 text-theme-secondary" />
        </div>
      </div>
    </div>
  )
}
