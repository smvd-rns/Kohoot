import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Play, Trophy, Music, ChevronRight, BarChart2, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button, Avatar, Spinner, Select } from '@/components/ui'
import { QRCodeSVG } from 'qrcode.react'
import Confetti from 'react-confetti'
import { supabase } from '@/lib/supabase'
import { quizService } from '@/services/quiz.service'
import { cn } from '@/lib/utils'
import type { QuizSession, Question, LeaderboardEntry } from '@/types'

const ANSWER_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const ANSWER_ICONS = ['▲', '◆', '●', '★']
import { BACKGROUND_MUSIC } from '@/lib/music'

export default function HostSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  
  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  
  const [participants, setParticipants] = useState<{ id: string; display_name: string; avatar_seed: string }[]>([])
  const [answers, setAnswers] = useState<{ participant_id: string; selected_option_ids: string[] }[]>([])
  
  const [timeLeft, setTimeLeft] = useState(0)
  const [hostState, setHostState] = useState<'lobby' | 'question' | 'results' | 'leaderboard' | 'completed'>('lobby')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [musicUrl, setMusicUrl] = useState('')
  const [isMuted, setIsMuted] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const s = await quizService.getSession(sessionId)
      setSession(s as unknown as QuizSession)
      
      if (s.quiz?.background_music_url) {
        setMusicUrl(s.quiz.background_music_url)
      } else {
        setMusicUrl(BACKGROUND_MUSIC[1].url) // Default to upbeat
      }

      const qs = await quizService.getQuestions(s.quiz_id)
      setQuestions(qs)
      
      if (s.status === 'completed') {
        setHostState('completed')
      } else if (s.status === 'active') {
        const idx = s.current_question_index ?? 0
        setCurrentQ(qs[idx])
        setHostState('question')
        setTimeLeft(qs[idx]?.time_limit ?? 30)
      } else {
        setHostState('lobby')
      }

      // Load existing participants
      const { data: parts } = await supabase.from('session_participants').select('*').eq('session_id', sessionId)
      if (parts) setParticipants(parts)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadSession() }, [loadSession])

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return
    
    const partsChannel = supabase.channel(`parts-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'kohoot', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, payload => {
        setParticipants(prev => [...prev, payload.new as any])
      })
      .subscribe()

    const ansChannel = supabase.channel(`ans-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'kohoot', table: 'participant_answers', filter: `session_id=eq.${sessionId}` }, payload => {
        const answer = payload.new as any
        setAnswers(prev => [...prev, answer])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(partsChannel)
      supabase.removeChannel(ansChannel)
    }
  }, [sessionId])

  // Question Timer
  useEffect(() => {
    if (hostState === 'question' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    // Auto end if everyone answered
    if (hostState === 'question' && participants.length > 0 && answers.length >= participants.length) {
      handleTimeUp()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [hostState, timeLeft, answers.length, participants.length])

  const broadcastState = useCallback((state: string) => {
    supabase.channel(`game-${sessionId}`).send({
      type: 'broadcast',
      event: 'host_state',
      payload: { state }
    })
  }, [sessionId])

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setHostState('results')
    broadcastState('results')
  }, [broadcastState])

  const handleStart = async () => {
    if (!session) return
    // Auto-publish the quiz so that RLS allows students to read the questions
    await quizService.updateQuiz(session.quiz_id, { is_published: true })
    
    await quizService.updateSessionStatus(session.id, 'active')
    await quizService.advanceQuestion(session.id, 0)
    setCurrentQ(questions[0])
    setTimeLeft(questions[0]?.time_limit ?? 30)
    setAnswers([])
    setHostState('question')
    broadcastState('question')
  }

  const handleShowLeaderboard = async () => {
    const lb = await quizService.getLeaderboard(sessionId!)
    setLeaderboard(lb as unknown as LeaderboardEntry[])
    setHostState('leaderboard')
    broadcastState('leaderboard')
  }

  const handleNextQuestion = async () => {
    if (!session) return
    const nextIdx = (session.current_question_index ?? 0) + 1
    if (nextIdx >= questions.length) {
      await quizService.updateSessionStatus(session.id, 'completed')
      setHostState('completed')
      broadcastState('completed')
    } else {
      await quizService.advanceQuestion(session.id, nextIdx)
      setSession({ ...session, current_question_index: nextIdx })
      setCurrentQ(questions[nextIdx])
      setTimeLeft(questions[nextIdx]?.time_limit ?? 30)
      setAnswers([])
      setHostState('question')
      broadcastState('question')
    }
  }

  if (loading || !session) {
    return <div className="flex h-[80vh] items-center justify-center"><Spinner size="lg" /></div>
  }

  // Lobby
  if (hostState === 'lobby') {
    const joinUrl = `${window.location.origin}/student/join?code=${session.room_code}`
    return (
      <div className="flex flex-col items-center p-8 space-y-8 h-[calc(100vh-6rem)] relative">
        {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}
        <div className="text-center">
          <h1 className="text-4xl font-black text-theme-primary mb-2">Join the Quiz!</h1>
          <p className="text-theme-secondary text-lg">Go to <span className="font-bold text-white bg-white/10 px-2 py-1 rounded">{window.location.origin}/student/join</span> and enter code</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="glass p-8 rounded-[3rem]">
            <p className="text-6xl font-black tracking-widest text-center text-theme-primary mb-6">{session.room_code}</p>
            <div className="bg-white p-4 rounded-3xl mx-auto w-max">
              <QRCodeSVG value={joinUrl} size={250} />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-theme-secondary" />
              <span className="text-4xl font-black text-theme-primary">{participants.length}</span>
              <span className="text-xl text-theme-secondary">Players</span>
            </div>
            <Button size="xl" onClick={handleStart} leftIcon={<Play className="w-6 h-6" />} disabled={participants.length === 0}>
              Start Quiz
            </Button>
          </div>
        </div>

        <div className="w-full max-w-4xl mt-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <AnimatePresence>
              {participants.map(p => (
                <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Avatar seed={p.avatar_seed} size="sm" />
                  <span className="font-bold text-theme-primary">{p.display_name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Music Selector for Lobby */}
        <div className="absolute top-8 right-8 w-80 glass p-3 rounded-2xl flex items-center gap-2 z-10">
          <Music className="w-5 h-5 text-theme-secondary" />
          <Select 
            options={BACKGROUND_MUSIC.map(m => ({ label: m.label, value: m.url }))} 
            value={musicUrl} 
            onChange={e => {
              setMusicUrl(e.target.value)
              setTimeout(() => {
                if (audioRef.current) audioRef.current.play().catch(console.error)
              }, 100)
            }} 
            className="flex-1 bg-transparent border-none text-sm font-bold min-w-0"
          />
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
          </button>
        </div>
      </div>
    )
  }

  // Completed
  if (hostState === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center relative w-full h-[calc(100vh-6rem)] overflow-hidden">
        {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={800} gravity={0.15} />
        
        {/* Cracker blasts & celebrations */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`burst-${i}`}
            initial={{ opacity: 1, scale: 0, x: window.innerWidth / 2, y: window.innerHeight / 2 }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0, Math.random() * 2 + 1, Math.random() * 3 + 2],
              x: window.innerWidth / 2 + (Math.random() * window.innerWidth - window.innerWidth / 2),
              y: window.innerHeight / 2 + (Math.random() * window.innerHeight - window.innerHeight / 2),
              rotate: Math.random() * 360
            }}
            transition={{ duration: 1.5 + Math.random() * 1, ease: 'easeOut' }}
            className="absolute pointer-events-none text-6xl z-0"
          >
            {['💥', '🎉', '🎂', '✨', '🎈'][i % 5]}
          </motion.div>
        ))}

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center relative z-10">
          <Trophy className="w-48 h-48 text-brand-500 mb-8 drop-shadow-2xl" />
          <h1 className="text-6xl font-black text-theme-primary mb-6">Quiz Completed!</h1>
          <Button size="xl" onClick={() => navigate('/admin/sessions')}>Back to Sessions</Button>
        </motion.div>
      </div>
    )
  }

  const options = currentQ?.answer_options ?? []
  
  // Calculate fastest correct answer
  const fastestAnswer = hostState === 'results' 
    ? answers.filter(a => (a as any).is_correct).sort((a, b) => (a as any).time_taken - (b as any).time_taken)[0] 
    : null
  
  const fastestParticipant = fastestAnswer 
    ? participants.find(p => p.id === fastestAnswer.participant_id) 
    : null

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden">
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}
      
      {/* Global Music Controls for Host */}
      <div className="absolute top-4 right-8 z-50 flex items-center gap-2">
        <button onClick={() => setIsMuted(!isMuted)} className="p-2 glass rounded-full hover:bg-white/10 transition-colors shadow-lg">
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
        </button>
      </div>
      
      <div className="flex items-center justify-between mb-8 px-8 pt-4">
        <div className="text-center">
          <p className="text-sm text-theme-secondary">Question {(session.current_question_index ?? 0) + 1} of {questions.length}</p>
        </div>
        
        {hostState === 'question' ? (
          <div className="glass px-6 py-3 rounded-full flex items-center gap-4">
            <div className="text-3xl font-black" style={{ color: timeLeft <= 5 ? '#ef4444' : 'var(--color-text-primary)' }}>
              {timeLeft}
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-2xl font-black text-theme-primary">{answers.length}</span>
              <span className="text-sm text-theme-secondary ml-1">Answers</span>
            </div>
            <Button size="sm" onClick={handleTimeUp}>Skip</Button>
          </div>
        ) : hostState === 'results' ? (
          <Button size="lg" rightIcon={<BarChart2 className="w-5 h-5" />} onClick={handleShowLeaderboard}>
            Next (Leaderboard)
          </Button>
        ) : (
          <Button size="lg" rightIcon={<ChevronRight className="w-5 h-5" />} onClick={handleNextQuestion}>
            Next Question
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center px-8">
        {hostState === 'leaderboard' ? (
          <div className="w-full max-w-2xl space-y-4 flex-1 overflow-y-auto pb-10">
            <h2 className="text-3xl font-black text-center mb-8">Top Players</h2>
            {leaderboard.slice(0, 10).map((e, i) => (
              <motion.div
                key={e.participant_id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl glass"
              >
                <span className="text-3xl w-10 text-center font-black">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <Avatar seed={e.avatar_seed} size="md" />
                <span className="flex-1 text-2xl font-bold text-white truncate">{e.display_name}</span>
                <span className="text-2xl font-black text-brand-400">{e.score.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center relative">
            {fastestParticipant && (
              <motion.div 
                initial={{ y: -50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="absolute -top-16 bg-brand-500 text-white px-6 py-2 rounded-full font-black text-lg shadow-xl shadow-brand-500/20 flex items-center gap-2"
              >
                ⚡ Fastest Answer: {fastestParticipant.display_name}
              </motion.div>
            )}
            
            {currentQ?.media_url && currentQ.media_type === 'image' && (
              <img src={currentQ.media_url} alt="Media" className="max-h-64 object-contain rounded-2xl mb-6" />
            )}
            
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 leading-tight">
              {currentQ?.text}
            </h2>

            {hostState === 'results' ? (
              <div className="w-full h-64 flex items-end justify-center gap-6 mt-8">
                {options.map((opt, i) => {
                  const count = answers.filter(a => a.selected_option_ids?.includes(opt.id)).length
                  const height = Math.max(10, answers.length ? (count / answers.length) * 100 : 0)
                  return (
                    <div key={opt.id} className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
                      <span className="font-bold text-xl">{count}</span>
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${height}%` }}
                        className={cn("w-full rounded-t-xl transition-all", opt.is_correct ? 'opacity-100' : 'opacity-40')}
                        style={{ background: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
                      />
                      <div className="w-full truncate text-center text-sm font-bold" style={{ color: opt.is_correct ? '#22c55e' : 'var(--color-text-secondary)' }}>
                        {opt.is_correct && '✓ '} {opt.text}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className="p-6 md:p-8 rounded-2xl text-white font-bold text-xl md:text-2xl flex items-center gap-4"
                    style={{ background: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
                  >
                    <span className="text-3xl opacity-70">{ANSWER_ICONS[i % 4]}</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
