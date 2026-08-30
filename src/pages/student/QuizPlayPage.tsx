import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Zap, Volume2, VolumeX } from 'lucide-react'
import { Button, Avatar, Progress, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { useAuthStore } from '@/store/authStore'
import { useQuizStore } from '@/store/quizStore'
import { cn, getTheme, getEmbedUrl } from '@/lib/utils'
import type { Question, AnswerOption, LeaderboardEntry, Quiz, QuizSession } from '@/types'
import toast from 'react-hot-toast'

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
  const [themeId, setThemeId] = useState<string>('modern')
  const [shuffledOptions, setShuffledOptions] = useState<AnswerOption[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [isTransit, setIsTransit] = useState(false)
  const [session, setSession] = useState<QuizSession | null>(null)
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
      setSession(session as unknown as QuizSession)
      setIsTransit(false)
      
      if (session.quiz) {
        setQuiz(session.quiz as unknown as Quiz)
      }
      if (session.quiz?.background_music_url) {
        setMusicUrl(session.quiz.background_music_url)
      } else {
        import('@/lib/music').then(m => setMusicUrl(m.BACKGROUND_MUSIC[1].url))
      }

      const activeQuizId = session.current_quiz_id || session.quiz_id
      let qs = await quizService.getQuestions(activeQuizId)
      
      // Shuffle questions if enabled in settings
      if (session.quiz?.shuffle_questions) {
        qs = [...qs].sort(() => Math.random() - 0.5)
      }
      setQuestions(qs)
      
      // Store current quiz theme styling values
      const quizTheme = session.quiz?.theme ?? 'modern'
      setThemeId(quizTheme)

      const activeIdx = session.current_question_index ?? 0
      setCurrentIdx(activeIdx)
      const activeQ = qs[activeIdx] ?? null
      setCurrentQ(activeQ)
      
      // Shuffle options if enabled for this question
      if (activeQ && session.quiz?.shuffle_options && activeQ.answer_options) {
        setShuffledOptions([...activeQ.answer_options].sort(() => Math.random() - 0.5))
      } else {
        setShuffledOptions(activeQ?.answer_options ?? [])
      }

      setTimeLeft(activeQ?.time_limit ?? 30)

      const part = (session.participants as unknown as Array<{ student_id: string; id: string; score: number }>)?.find(p => p.student_id === profile.id)
      if (part) { 
        setParticipantId(part.id)
        setScore(part.score)

        // Check if student has already answered the current question to prevent cheating on reload
        if (activeQ) {
          const { data: answeredList } = await supabase
            .from('participant_answers')
            .select('*')
            .eq('participant_id', part.id)
          
          const existingAnswer = answeredList?.find(ans => ans.question_id === activeQ.id)
          if (existingAnswer) {
            setHasAnswered(true)
            setIsCorrect(existingAnswer.is_correct)
            setPointsEarned(existingAnswer.points_earned)
            setSelected(existingAnswer.selected_option_ids || [])
          }
        }
      }
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
        const s = payload.new as { status: string; current_question_index: number; current_quiz_id?: string }
        if (s.status === 'completed') { setIsFinished(true); navigate(`/quiz/results/${sessionId}`); return }
        
        if (s.current_quiz_id && s.current_quiz_id !== session?.current_quiz_id) {
          setLoading(true)
          await loadQuiz()
          return
        }

        const idx = s.current_question_index
        if (idx !== currentIdx) {
          setCurrentIdx(idx)
          const nextQ = questions[idx] ?? null
          setCurrentQ(nextQ)
          
          // Shuffle options if enabled for next question in live mode
          if (nextQ && quiz?.shuffle_options && nextQ.answer_options) {
            setShuffledOptions([...nextQ.answer_options].sort(() => Math.random() - 0.5))
          } else {
            setShuffledOptions(nextQ?.answer_options ?? [])
          }

          setTimeLeft(nextQ?.time_limit ?? 30)
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
        } else if (payload.state === 'transit') {
          setIsTransit(true)
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
  }, [sessionId, currentIdx, questions, navigate, hasAnswered, handleTimeUp, session?.current_quiz_id])

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
    
    let correct = false
    let earned = 0

    if (currentQ.custom_weighting) {
      const selectedWeightsSum = sel.reduce((sum, id) => {
        const opt = currentQ.answer_options?.find(o => o.id === id)
        return sum + (opt?.weight ?? 0)
      }, 0)
      const weightRatio = Math.min(100, selectedWeightsSum) / 100

      const maxPoints = currentQ.points || 1000
      const timeRatio = Math.min(1, timeTaken / (currentQ.time_limit * 1000))
      const basePoints = maxPoints * 0.8
      const speedBonus = maxPoints * 0.2 * (1 - timeRatio)

      earned = Math.round((basePoints + speedBonus) * weightRatio)
      correct = weightRatio > 0
    } else {
      const correctIds = currentQ.answer_options?.filter(o => o.is_correct).map(o => o.id) ?? []
      correct = sel.length > 0 && sel.every(id => correctIds.includes(id)) && sel.length === correctIds.length

      const maxPoints = currentQ.points || 1000
      const timeRatio = Math.min(1, timeTaken / (currentQ.time_limit * 1000))
      const basePoints = maxPoints * 0.8
      const speedBonus = maxPoints * 0.2 * (1 - timeRatio)

      earned = correct ? Math.round(basePoints + speedBonus) : 0
    }

    setHasAnswered(true)
    setIsCorrect(correct)
    setPointsEarned(earned)
    if (earned > 0) setScore(s => s + earned)

    try {
      await quizService.submitAnswer(participantId, sessionId!, currentQ.id, sel, '', timeTaken, correct, earned)
    } catch (err) {
      console.error('Failed to submit answer:', err)
      setHasAnswered(false)
      if (earned > 0) setScore(s => s - earned)
      toast.error('Network issue: Failed to save your answer. Please click Submit again.')
    }
  }

  if (isTransit) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
        <div className="max-w-md w-full glass-strong p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="text-6xl animate-bounce">🏁</div>
          <h2 className="text-3xl font-black text-white">Quiz Finished!</h2>
          <p className="text-theme-secondary text-sm leading-relaxed">
            Get ready for the next quiz in this event.
          </p>
          {session?.transition_messages && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 italic text-theme-primary text-sm font-medium">
              "{session.transition_messages[session.quiz_ids?.indexOf(session.current_quiz_id ?? '') ?? 0] || 'Stay tuned, the next quiz is starting soon!'}"
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-brand-400 font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-brand-400" />
            Waiting for Host to start...
          </div>
        </div>
      </div>
    )
  }

  if (loading || !currentQ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-xs text-theme-secondary font-medium">Loading session content...</p>
        </div>
      </div>
    )
  }

  const isMulti = currentQ.type === 'multi_select'
  const activeTheme = getTheme(themeId as never)

  return (
    <div data-theme={themeId} className="fixed inset-0 flex flex-col transition-colors duration-500" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}

      {/* === Sound enable banner === */}
      {showSoundBanner && musicUrl && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-2 left-2 right-2 z-50 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-white/10"
          style={{ background: 'linear-gradient(135deg, #7c6fef, #f928b8)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎵</span>
            <span className="text-white text-xs sm:text-sm font-semibold text-center sm:text-left">
              Background music is ready!
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={enableSound}
              className="bg-white text-[#7c6fef] text-xs font-black px-4 py-1.5 rounded-full hover:scale-105 transition-all shadow-md flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" /> Enable Sound
            </button>
            <button
              onClick={() => setShowSoundBanner(false)}
              className="text-white/70 hover:text-white text-xs p-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Leaderboard overlay */}
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardOverlay entries={leaderboard} myId={participantId} />
        )}
      </AnimatePresence>

      {/* Score feedback overlay removed - now displayed inline at the bottom */}

      {/* Header */}
      <div className="relative z-10 px-4 pt-3 pb-2 glass-strong border-b border-white/10">
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-2">
          {/* Left: Profile & Score */}
          <div className="flex items-center gap-2">
            <Avatar seed={profile?.avatar_seed ?? 'default'} size="sm" />
            <div>
              <p className="text-xs text-theme-secondary font-medium leading-none mb-1 max-w-[100px] truncate">{profile?.display_name}</p>
              <p className="text-sm font-black text-white leading-none flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-warning-400 fill-warning-400" />{score.toLocaleString()} pts
              </p>
            </div>
          </div>

          {/* Right: Controls & Timer */}
          <div className="flex items-center gap-3">
            {musicUrl && (
              <button 
                onClick={() => {
                  const nextMuted = !isMuted
                  setIsMuted(nextMuted)
                  setShowSoundBanner(false)
                  if (audioRef.current) {
                    audioRef.current.muted = nextMuted
                    if (!nextMuted) {
                      audioRef.current.play().catch(console.error)
                    }
                  }
                }} 
                className="p-2 glass rounded-full hover:bg-white/10 transition-colors shadow-md flex items-center justify-center"
                title={isMuted ? "Unmute Music" : "Mute Music"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
              </button>
            )}
            <TimerRing seconds={timeLeft} total={currentQ.time_limit} />
          </div>
        </div>

        {/* Sub-header: Question progress */}
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs border-t border-white/5 pt-2">
          <div className="text-theme-secondary font-bold">
            Question <span className="text-theme-primary text-sm font-black ml-1">{currentIdx + 1} / {questions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <Progress value={currentIdx + 1} max={questions.length} height={4} />
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
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
          {currentQ.media_url && currentQ.media_type === 'video' && (
            <div className="mb-4 rounded-2xl overflow-hidden glass aspect-video flex items-center justify-center">
              <iframe
                src={getEmbedUrl(currentQ.media_url) || currentQ.media_url}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Question text */}
          <div className="glass-strong rounded-3xl p-6 mb-6 text-center">
            <p className="text-xl sm:text-2xl font-bold text-theme-primary leading-snug">{currentQ.text || 'Loading question...'}</p>
            {isMulti && <p className="text-xs text-theme-secondary mt-2">Select all that apply, then submit</p>}
          </div>

          {/* Options */}
          {['multiple_choice', 'true_false', 'multi_select', 'poll', 'image_based', 'video_based'].includes(currentQ.type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shuffledOptions.map((opt, i) => {
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
                      showCorrect && 'ring-4 ring-green-400 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]',
                      showWrong && 'opacity-30',
                      isSelected && !hasAnswered && 'ring-4 ring-white'
                    )}
                    style={{
                      background: showCorrect ? '#22c55e' : showWrong ? '#ef4444' : color,
                      opacity: hasAnswered && !showCorrect && !showWrong ? 0.6 : 1,
                    }}
                  >
                    <span className="text-xl opacity-70 flex-shrink-0">{ANSWER_ICONS[i % 4]}</span>
                    <span className="flex-1">{opt.text}</span>
                    {showCorrect && <CheckCircle className="w-5 h-5 ml-auto flex-shrink-0 text-white" />}
                    {showWrong && <XCircle className="w-5 h-5 ml-auto flex-shrink-0 text-white" />}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Fill blank */}
          {currentQ.type === 'fill_blank' && !hasAnswered && (
            <div className="flex gap-3">
              <input
                className="input-field flex-1"
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
                className="input-field min-h-[100px]"
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
              className="mt-6 border border-theme bg-theme-secondary rounded-2xl p-5 shadow-sm"
            >
              <div className="flex gap-2.5 items-start">
                <span className="text-xl leading-none">💡</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-theme-secondary">Explanation</h4>
                  <p className="text-sm sm:text-base text-theme-primary leading-relaxed font-medium">{currentQ.explanation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Inline Bottom Score Feedback Panel */}
      <AnimatePresence>
        {hasAnswered && !showLeaderboard && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "relative z-20 border-t py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md",
              isCorrect ? "bg-emerald-950/80 border-emerald-500/20" : "bg-rose-950/80 border-rose-500/20"
            )}
          >
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                isCorrect ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              )}>
                {isCorrect ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div className="text-left">
                <p className="text-white font-extrabold text-lg sm:text-xl">
                  {isCorrect ? `Correct! +${pointsEarned} pts` : "Incorrect!"}
                </p>
                <p className="text-xs text-white/70 font-medium">
                  {isCorrect ? "Awesome job! Keep it up." : "Better luck on the next question."}
                </p>
              </div>
            </div>

            {/* In live host mode, waiting for host to progress or self-placed next button */}
            <div className="text-xs text-white/50 font-bold uppercase tracking-widest bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
              Waiting for next question...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
