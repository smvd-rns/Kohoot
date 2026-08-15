import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, ChevronRight, Clock, Zap, AlertTriangle, Volume2, VolumeX } from 'lucide-react'
import { Button, Avatar, Progress, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { useAuthStore } from '@/store/authStore'
import { cn, getTheme, getEmbedUrl } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Question, AnswerOption, Quiz } from '@/types'

const ANSWER_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const ANSWER_ICONS = ['▲', '◆', '●', '★']

// ── Timer Ring ────────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = (seconds / total) * 100
  const size = 72
  const r = 26
  const circ = 2 * Math.PI * r
  const strokePct = circ - (pct / 100) * circ
  const color = seconds > total * 0.5 ? '#22c55e' : seconds > total * 0.2 ? '#eab308' : '#ef4444'
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={strokePct}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className="absolute text-lg font-black" style={{ color }}>{seconds}</span>
    </div>
  )
}

// ── Deadline Badge ────────────────────────────────────────────────────────────
function DeadlineBadge({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const d = Math.floor(diff / 86400000)
      if (d > 0) setRemaining(`${d}d ${h % 24}h left`)
      else if (h > 0) setRemaining(`${h}h ${m}m left`)
      else setRemaining(`${m}m left`)
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [deadline])
  const isUrgent = new Date(deadline).getTime() - Date.now() < 3600000
  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', isUrgent ? 'bg-danger-500/20 text-danger-400' : 'bg-white/10 text-theme-secondary')}>
      {isUrgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      Deadline: {remaining}
    </div>
  )
}

export default function SelfPacedPlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [questions, setQuestions] = useState<Question[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [selected, setSelected] = useState<string[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [participantId, setParticipantId] = useState('')
  const [deadline, setDeadline] = useState<string | undefined>()
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [musicUrl, setMusicUrl] = useState('')
  const [isMuted, setIsMuted] = useState(true)         // start muted — browsers block autoplay
  const [showSoundBanner, setShowSoundBanner] = useState(true)
  const [themeId, setThemeId] = useState<string>('modern')
  const [shuffledOptions, setShuffledOptions] = useState<AnswerOption[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const answerStartTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync mute state to DOM
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
      if (!isMuted && musicUrl) audioRef.current.play().catch(() => {})
    }
  }, [isMuted, musicUrl])

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
      if (session.quiz) {
        setQuiz(session.quiz as unknown as Quiz)
      }
      if (session.deadline) {
        setDeadline(session.deadline)
        if (new Date(session.deadline).getTime() < Date.now()) {
          setDeadlinePassed(true)
          setLoading(false)
          return
        }
      }

      // Load background music if configured
      if (session.quiz?.background_music_url) {
        setMusicUrl(session.quiz.background_music_url)
      }

      let qs = await quizService.getQuestions(session.quiz_id)
      
      // Shuffle questions if enabled in settings
      if (session.quiz?.shuffle_questions) {
        qs = [...qs].sort(() => Math.random() - 0.5)
      }
      setQuestions(qs)

      // Store current quiz theme styling values
      const quizTheme = session.quiz?.theme ?? 'modern'
      setThemeId(quizTheme)

      // Get or create participant record
      let part = (session.participants as unknown as Array<{ student_id: string; id: string; score: number; student_question_index: number; is_finished: boolean }>)
        ?.find(p => p.student_id === profile.id)

      if (!part) {
        // Check if the quiz has custom registration fields
        const customFields = await quizService.getCustomFields(session.quiz_id)
        if (customFields.length > 0) {
          // Redirect to join page to collect registration data first.
          // JoinQuizPage will save custom field responses, then navigate back here.
          navigate(`/join?code=${session.room_code}`, { replace: true })
          return
        }
        const joined = await quizService.joinSession(sessionId, profile.id, profile.display_name, profile.avatar_seed)
        part = joined as unknown as typeof part
      }

      if (part) {
        setParticipantId(part.id)
        setScore(part.score)
        if (part.is_finished) {
          // Already completed — go to results
          navigate(`/quiz/results/${sessionId}`)
          return
        }
        const startIdx = part.student_question_index ?? 0
        setCurrentIdx(startIdx)
        
        // Safety check if questions were shuffled or index changed
        const activeQ = qs[startIdx] ?? null
        setCurrentQ(activeQ)
        
        // Shuffle options if enabled for this question
        if (activeQ && session.quiz?.shuffle_options && activeQ.answer_options) {
          setShuffledOptions([...activeQ.answer_options].sort(() => Math.random() - 0.5))
        } else {
          setShuffledOptions(activeQ?.answer_options ?? [])
        }

        setTimeLeft(activeQ?.time_limit ?? 30)

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
    } catch (err) {
      toast.error('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }, [sessionId, profile, navigate])

  useEffect(() => { loadQuiz() }, [loadQuiz])

  // Per-question countdown timer
  useEffect(() => {
    if (!currentQ || hasAnswered || deadlinePassed) return
    answerStartTime.current = Date.now()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentQ?.id, hasAnswered])

  const handleTimeUp = useCallback(() => {
    setHasAnswered(true)
    setIsCorrect(false)
    setPointsEarned(0)
    if (participantId && currentQ) {
      quizService.submitAnswer(participantId, sessionId!, currentQ.id, [], '', currentQ.time_limit * 1000, false, 0).catch(() => {})
    }
  }, [participantId, sessionId, currentQ])

  const submitAnswer = async (sel: string[]) => {
    if (!currentQ || !participantId || hasAnswered) return
    if (timerRef.current) clearInterval(timerRef.current)
    const timeTaken = Date.now() - answerStartTime.current
    const correctIds = currentQ.answer_options?.filter(o => o.is_correct).map(o => o.id) ?? []
    const correct = sel.length > 0 && sel.every(id => correctIds.includes(id)) && sel.length === correctIds.length

    // Dynamic scoring for self-paced (80% base points, 20% speed bonus)
    const maxPoints = currentQ.points || 1000
    const timeRatio = Math.min(1, timeTaken / (currentQ.time_limit * 1000))
    const basePoints = maxPoints * 0.8
    const speedBonus = maxPoints * 0.2 * (1 - timeRatio)
    const earned = correct ? Math.round(basePoints + speedBonus) : 0

    setHasAnswered(true)
    setIsCorrect(correct)
    setPointsEarned(earned)
    if (correct) setScore(s => s + earned)

    try {
      await quizService.submitAnswer(participantId, sessionId!, currentQ.id, sel, '', timeTaken, correct, earned)
    } catch (err) {
      console.error('Failed to submit answer:', err)
      setHasAnswered(false)
      if (correct) setScore(s => s - earned)
      toast.error('Network issue: Failed to save your answer. Please click Submit again.')
    }
  }

  const handleAnswer = async (optionId: string) => {
    if (hasAnswered || !currentQ) return
    const newSelected = currentQ.type === 'multi_select'
      ? (selected.includes(optionId) ? selected.filter(o => o !== optionId) : [...selected, optionId])
      : [optionId]
    setSelected(newSelected)
    if (currentQ.type !== 'multi_select') {
      await submitAnswer(newSelected)
    }
  }

  const handleNext = async () => {
    if (!participantId) return
    const nextIdx = currentIdx + 1
    if (nextIdx >= questions.length) {
      // All questions done
      await quizService.finishStudentSession(participantId)
      navigate(`/quiz/results/${sessionId}`)
    } else {
      await quizService.advanceStudentQuestion(participantId, nextIdx)
      setCurrentIdx(nextIdx)
      const nextQ = questions[nextIdx]
      setCurrentQ(nextQ)
      
      // Shuffle options if enabled for next question
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
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (deadlinePassed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 px-4" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl">⏰</motion.div>
        <h1 className="text-3xl font-black text-white text-center">Quiz Deadline Passed</h1>
        <p className="text-theme-secondary text-center max-w-sm">The deadline for this quiz has passed. You can no longer submit answers.</p>
        <Button onClick={() => navigate('/student')}>Back to Dashboard</Button>
      </div>
    )
  }

  if (!currentQ) return null

  const options = currentQ.answer_options ?? []
  const isMulti = currentQ.type === 'multi_select'
  const activeTheme = getTheme(themeId as never)

  return (
    <div data-theme={themeId} className="fixed inset-0 flex flex-col transition-colors duration-500" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}

      {/* Sound enable banner */}
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
            <button onClick={enableSound}
              className="bg-white text-purple-700 text-xs font-black px-4 py-1.5 rounded-full hover:scale-105 transition-transform flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Enable Sound
            </button>
            <button onClick={() => setShowSoundBanner(false)} className="text-white/70 hover:text-white text-xs p-1">✕</button>
          </div>
        </motion.div>
      )}

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

        {/* Sub-header: Question progress & Deadline */}
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs border-t border-white/5 pt-2">
          <div className="text-theme-secondary font-bold">
            Question <span className="text-theme-primary text-sm font-black ml-1">{currentIdx + 1} / {questions.length}</span>
          </div>
          {deadline && <DeadlineBadge deadline={deadline} />}
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <Progress value={currentIdx + 1} max={questions.length} height={4} />
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 overflow-y-auto">
        <motion.div key={currentQ.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
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

          {/* MC / TF / Multi / Poll options */}
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
                      'relative p-4 rounded-2xl text-white font-bold text-left transition-all text-sm sm:text-base flex items-center gap-3',
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
              <input className="input-field flex-1" placeholder="Type your answer..."
                value={selected[0] ?? ''} onChange={e => setSelected([e.target.value])} />
              <Button onClick={() => submitAnswer(selected)} disabled={!selected[0]}>Submit</Button>
            </div>
          )}

          {/* Open ended */}
          {currentQ.type === 'open_ended' && !hasAnswered && (
            <div className="space-y-3">
              <textarea className="input-field min-h-[100px]" placeholder="Write your answer..."
                value={selected[0] ?? ''} onChange={e => setSelected([e.target.value])} />
              <Button className="w-full" onClick={() => submitAnswer(selected)}>Submit Answer</Button>
            </div>
          )}

          {/* Multi select submit */}
          {isMulti && !hasAnswered && selected.length > 0 && (
            <Button className="w-full mt-4" onClick={() => submitAnswer(selected)}>
              Submit Answers ({selected.length} selected)
            </Button>
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
        {hasAnswered && (
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

            <Button 
              className={cn(
                "w-full sm:w-auto font-black px-8 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2",
                isCorrect ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-rose-500 hover:bg-rose-400 text-white"
              )}
              rightIcon={<ChevronRight className="w-5 h-5" />} 
              onClick={handleNext}
            >
              {currentIdx + 1 >= questions.length ? '🎉 Finish Quiz' : 'Next Question'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
