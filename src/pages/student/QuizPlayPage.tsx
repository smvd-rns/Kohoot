import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Zap } from 'lucide-react'
import { Button, Avatar, Progress, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { useAuthStore } from '@/store/authStore'
import { useQuizStore } from '@/store/quizStore'
import { cn } from '@/lib/utils'
import type { Question, AnswerOption, LeaderboardEntry } from '@/types'

const ANSWER_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const ANSWER_ICONS = ['▲', '◆', '●', '★']
const ANSWER_LABELS = ['A', 'B', 'C', 'D']

// ── Timer component ──────────────────────────────────────────────────────────
function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = (seconds / total) * 100
  const size = 80
  const r = 30
  const circ = 2 * Math.PI * r
  const strokePct = circ - (pct / 100) * circ

  const color = seconds > total * 0.5 ? '#22c55e' : seconds > total * 0.2 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokePct}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className="absolute text-xl font-black" style={{ color }}>{seconds}</span>
    </div>
  )
}

// ── Leaderboard overlay ───────────────────────────────────────────────────────
function LeaderboardOverlay({ entries, myId }: { entries: LeaderboardEntry[]; myId: string }) {
  const myEntry = entries.find(e => e.participant_id === myId)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-8 px-4 pb-4"
      style={{ background: 'linear-gradient(135deg, #0f0e17, #1a1831)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h2 initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl font-black text-white mb-2">🏆 Leaderboard</motion.h2>
      {myEntry && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass px-6 py-2 rounded-full mb-6 text-sm font-bold text-brand-400">
          Your rank: #{myEntry.rank} · {myEntry.score.toLocaleString()} pts
        </motion.div>
      )}
      <div className="w-full max-w-md space-y-2 flex-1 overflow-y-auto">
        {entries.slice(0, 10).map((e, i) => (
          <motion.div
            key={e.participant_id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn('flex items-center gap-3 p-3 rounded-xl', e.participant_id === myId ? 'glass-strong border border-brand-500' : 'glass')}
          >
            <span className="text-2xl w-8 text-center font-black">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <Avatar seed={e.avatar_seed} size="sm" />
            <span className="flex-1 font-bold text-white truncate">{e.display_name}</span>
            <span className="font-black text-brand-400">{e.score.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 w-full max-w-md text-center">
        <p className="text-theme-secondary font-medium animate-pulse">Waiting for host to start next question...</p>
      </div>
    </motion.div>
  )
}

// ── Main quiz play page ───────────────────────────────────────────────────────
export default function QuizPlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const store = useQuizStore()

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selected, setSelected] = useState<string[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [score, setScore] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [participantId, setParticipantId] = useState<string>('')
  const [musicUrl, setMusicUrl] = useState('')
  const [isMuted, setIsMuted] = useState(true)   // start muted — browsers block autoplay without user gesture
  const [showSoundBanner, setShowSoundBanner] = useState(true) // prompt user to enable sound
  const answerStartTime = useRef(Date.now())
  const audioRef = useRef<HTMLAudioElement>(null)

  // Sync audio mute state to DOM element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
      if (!isMuted && musicUrl) {
        audioRef.current.play().catch(() => {})
      }
    }
  }, [isMuted, musicUrl])

  // Unlock & play audio when user enables sound
  const enableSound = () => {
    setShowSoundBanner(false)
    setIsMuted(false)
    if (audioRef.current) {
      audioRef.current.muted = false
      audioRef.current.play().catch(() => {})
    }
  }

  const loadQuiz = useCallback(async () => {
    if (!sessionId || !profile) return
    try {
      const session = await quizService.getSession(sessionId)
      
      if (session.quiz?.background_music_url) {
        setMusicUrl(session.quiz.background_music_url)
      } else {
        import('@/lib/music').then(m => setMusicUrl(m.BACKGROUND_MUSIC[1].url))
      }

      const qs = await quizService.getQuestions(session.quiz_id)
      setQuestions(qs)
      setCurrentIdx(session.current_question_index ?? 0)
      setCurrentQ(qs[session.current_question_index ?? 0] ?? null)
      setTimeLeft(qs[0]?.time_limit ?? 30)

      const part = (session.participants as unknown as Array<{ student_id: string; id: string; score: number }>)?.find(p => p.student_id === profile.id)
      if (part) { setParticipantId(part.id); setScore(part.score) }
    } finally { setLoading(false) }
  }, [sessionId, profile])

  useEffect(() => { loadQuiz() }, [loadQuiz])

  const handleTimeUp = useCallback(() => {
    setHasAnswered(true)
    setIsCorrect(false)
    setPointsEarned(0)
    if (participantId && currentQ) {
      quizService.submitAnswer(participantId, sessionId!, currentQ.id, [], '', currentQ.time_limit * 1000, false, 0).catch(() => {})
    }
  }, [participantId, sessionId, currentQ])

  // Countdown timer
  useEffect(() => {
    if (!currentQ || hasAnswered || isFinished) return
    answerStartTime.current = Date.now()
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t)
          if (!hasAnswered) handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [currentQ?.id, hasAnswered, handleTimeUp])

  // Real-time: listen for question advances and broadcast events from admin
  useEffect(() => {
    if (!sessionId) return
    const ch = supabase.channel(`game-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, async (payload) => {
        const s = payload.new as { status: string; current_question_index: number }
        if (s.status === 'completed') { setIsFinished(true); navigate(`/quiz/results/${sessionId}`); return }
        const idx = s.current_question_index
        if (idx !== currentIdx) {
          setCurrentIdx(idx)
          setCurrentQ(questions[idx] ?? null)
          setTimeLeft(questions[idx]?.time_limit ?? 30)
          setSelected([])
          setHasAnswered(false)
          setIsCorrect(null)
          setPointsEarned(0)
          setShowLeaderboard(false)
          answerStartTime.current = Date.now()
        }
      })
      .on('broadcast', { event: 'host_state' }, async ({ payload }) => {
        if (payload.state === 'leaderboard') {
          const lb = await quizService.getLeaderboard(sessionId!)
          setLeaderboard(lb as unknown as LeaderboardEntry[])
          setShowLeaderboard(true)
        } else if (payload.state === 'results') {
          // Host stopped the timer early
          if (!hasAnswered) {
             handleTimeUp()
          }
        } else if (payload.state === 'completed') {
          setIsFinished(true)
          navigate(`/quiz/results/${sessionId}`)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, currentIdx, questions, navigate, hasAnswered, handleTimeUp])

  const handleAnswer = async (optionId: string) => {
    if (hasAnswered || !currentQ || !participantId) return
    const newSelected = currentQ.type === 'multi_select' ? (selected.includes(optionId) ? selected.filter(o => o !== optionId) : [...selected, optionId]) : [optionId]
    setSelected(newSelected)

    if (currentQ.type === 'multi_select') return // wait for submit

    await submitAnswer(newSelected)
  }

  const submitAnswer = async (sel: string[]) => {
    if (!currentQ || !participantId) return
    const timeTaken = Date.now() - answerStartTime.current
    const correctIds = currentQ.answer_options?.filter(o => o.is_correct).map(o => o.id) ?? []
    const correct = sel.length > 0 && sel.every(id => correctIds.includes(id)) && sel.length === correctIds.length

    // Kahoot style scoring: Points = maxPoints * (1 - (timeTaken / (timeLimit * 1000) / 2))
    const maxPoints = currentQ.points || 1000
    const timeRatio = Math.min(1, timeTaken / (currentQ.time_limit * 1000))
    const earned = correct ? Math.round(maxPoints * (1 - (timeRatio / 2))) : 0

    setHasAnswered(true)
    setIsCorrect(correct)
    setPointsEarned(earned)
    if (correct) setScore(s => s + earned)

    await quizService.submitAnswer(participantId, sessionId!, currentQ.id, sel, '', timeTaken, correct, earned)
  }

  if (loading || !currentQ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const options = currentQ.answer_options ?? []
  const isMulti = currentQ.type === 'multi_select'

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}

      {/* === Sound enable banner === */}
      {showSoundBanner && musicUrl && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3"
          style={{ background: 'linear-gradient(90deg, #7c6fef, #f928b8)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <span className="text-white text-sm font-semibold">Music is ready — tap to enable sound</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={enableSound}
              className="bg-white text-brand-600 text-xs font-black px-4 py-1.5 rounded-full hover:scale-105 transition-transform"
            >
              🔊 Enable Sound
            </button>
            <button
              onClick={() => setShowSoundBanner(false)}
              className="text-white/70 hover:text-white text-xs px-2"
            >
              ✕ No thanks
            </button>
          </div>
        </motion.div>
      )}

      {/* Music mute toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button onClick={() => {
          const nextMuted = !isMuted
          setIsMuted(nextMuted)
          setShowSoundBanner(false)
          if (audioRef.current) audioRef.current.play().catch(console.error)
        }} className="p-2 glass rounded-full hover:bg-white/10 transition-colors shadow-lg">
          {isMuted ? <span className="text-red-400">🔇</span> : <span className="text-green-400">🔊</span>}
        </button>
      </div>

      {/* Leaderboard overlay */}
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardOverlay entries={leaderboard} myId={participantId} />
        )}
      </AnimatePresence>

      {/* Score feedback */}
      <AnimatePresence>
        {hasAnswered && !showLeaderboard && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn('flex flex-col items-center gap-3 p-8 rounded-3xl', isCorrect ? 'bg-success-500/20' : 'bg-danger-500/20')}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {isCorrect ? (
                <>
                  <CheckCircle className="w-20 h-20 text-success-400" />
                  <p className="text-4xl font-black text-white">+{pointsEarned}</p>
                  <p className="text-success-400 font-bold">Correct! 🎉</p>
                </>
              ) : (
                <>
                  <XCircle className="w-20 h-20 text-danger-400" />
                  <p className="text-2xl font-black text-white">Wrong!</p>
                  <p className="text-danger-400 font-medium">Better luck next time</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 px-4 pt-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-3">
          <div className="flex items-center gap-2">
            <Avatar seed={profile?.avatar_seed ?? 'default'} size="sm" />
            <div>
              <p className="text-xs text-theme-secondary">{profile?.display_name}</p>
              <p className="text-sm font-black text-white flex items-center gap-1">
                <Zap className="w-3 h-3 text-warning-400" />{score.toLocaleString()} pts
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-theme-secondary">Question</p>
            <p className="text-sm font-black text-white">{currentIdx + 1} / {questions.length}</p>
          </div>
          <TimerRing seconds={timeLeft} total={currentQ.time_limit} />
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto">
          <Progress value={currentIdx + 1} max={questions.length} height={4} />
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          {/* Media */}
          {currentQ.media_url && currentQ.media_type === 'image' && (
            <div className="mb-4 rounded-2xl overflow-hidden max-h-48 flex items-center justify-center glass">
              <img src={currentQ.media_url} alt="Question media" className="max-h-48 object-contain" />
            </div>
          )}

          {/* Question text */}
          <div className="glass-strong rounded-3xl p-6 mb-6 text-center">
            <p className="text-xl sm:text-2xl font-bold text-white leading-snug">{currentQ.text || 'Loading question...'}</p>
            {isMulti && <p className="text-xs text-theme-secondary mt-2">Select all that apply, then submit</p>}
          </div>

          {/* Options */}
          {['multiple_choice', 'true_false', 'multi_select', 'poll'].includes(currentQ.type) && (
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => {
                const color = ANSWER_COLORS[i % ANSWER_COLORS.length]
                const isSelected = selected.includes(opt.id)
                const showCorrect = hasAnswered && opt.is_correct
                const showWrong = hasAnswered && isSelected && !opt.is_correct

                return (
                  <motion.button
                    key={opt.id}
                    whileHover={!hasAnswered ? { scale: 1.03 } : undefined}
                    whileTap={!hasAnswered ? { scale: 0.97 } : undefined}
                    onClick={() => handleAnswer(opt.id)}
                    disabled={hasAnswered && !isMulti}
                    className={cn(
                      'relative p-4 rounded-2xl text-white font-bold text-left transition-all text-sm sm:text-base',
                      'flex items-center gap-3',
                      showCorrect && 'ring-4 ring-white scale-105',
                      showWrong && 'opacity-60',
                      isSelected && !hasAnswered && 'ring-4 ring-white'
                    )}
                    style={{
                      background: showCorrect ? '#22c55e' : showWrong ? '#ef4444' : color,
                      opacity: hasAnswered && !isSelected && !opt.is_correct ? 0.6 : 1,
                    }}
                  >
                    <span className="text-xl opacity-70 flex-shrink-0">{ANSWER_ICONS[i % 4]}</span>
                    <span className="flex-1">{opt.text}</span>
                    {showCorrect && <CheckCircle className="w-5 h-5 ml-auto flex-shrink-0" />}
                    {showWrong && <XCircle className="w-5 h-5 ml-auto flex-shrink-0" />}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Fill blank */}
          {currentQ.type === 'fill_blank' && !hasAnswered && (
            <div className="flex gap-3">
              <input
                className="input-field flex-1 text-white"
                placeholder="Type your answer..."
                value={selected[0] ?? ''}
                onChange={e => setSelected([e.target.value])}
              />
              <Button onClick={() => submitAnswer(selected)} disabled={!selected[0]}>Submit</Button>
            </div>
          )}

          {/* Open ended */}
          {currentQ.type === 'open_ended' && !hasAnswered && (
            <div className="space-y-3">
              <textarea
                className="input-field text-white min-h-[100px]"
                placeholder="Write your answer..."
                value={selected[0] ?? ''}
                onChange={e => setSelected([e.target.value])}
              />
              <Button className="w-full" onClick={() => submitAnswer(selected)}>Submit Answer</Button>
            </div>
          )}

          {/* Multi select submit */}
          {isMulti && !hasAnswered && selected.length > 0 && (
            <Button className="w-full mt-4" onClick={() => submitAnswer(selected)}>Submit Answers ({selected.length} selected)</Button>
          )}

          {/* Explanation */}
          {hasAnswered && currentQ.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 glass rounded-2xl p-4"
            >
              <p className="text-sm text-theme-secondary">💡 {currentQ.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
