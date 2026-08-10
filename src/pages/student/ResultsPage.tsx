import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactConfetti from 'react-confetti'
import { Trophy, Star, Home, RotateCcw, Download } from 'lucide-react'
import { Button, Avatar } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { useAuthStore } from '@/store/authStore'
import { scoreGrade, cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myResult, setMyResult] = useState<LeaderboardEntry | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    window.addEventListener('resize', () => setWindowSize({ width: window.innerWidth, height: window.innerHeight }))
    if (!sessionId || !profile) return
    quizService.getLeaderboard(sessionId).then(async (lb) => {
      const entries = lb as unknown as LeaderboardEntry[]
      setLeaderboard(entries)
      const me = (entries as any).find((e: any) => e.student_id === profile.id) ?? null
      setMyResult(me)
      if (me?.id) {
        try {
          await quizService.finishStudentSession(me.id)
        } catch (err) {
          console.error('Failed to mark student session as finished:', err)
        }
      }
    })
    // Stop confetti after 6s
    const t = setTimeout(() => setShowConfetti(false), 6000)
    return () => clearTimeout(t)
  }, [sessionId, profile])

  const grade = myResult ? scoreGrade(myResult.rank <= 3 ? 90 : myResult.rank <= 10 ? 70 : 50) : scoreGrade(0)
  const top3 = leaderboard.slice(0, 3)

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'linear-gradient(135deg, #0f0e17, #1a1831)' }}>
      {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} gravity={0.15} />}

      {/* Cracker blasts & celebrations */}
      {showConfetti && Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`burst-${i}`}
          initial={{ opacity: 1, scale: 0, x: windowSize.width / 2, y: windowSize.height / 2 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0, Math.random() * 2 + 1, Math.random() * 3 + 2],
            x: windowSize.width / 2 + (Math.random() * windowSize.width - windowSize.width / 2),
            y: windowSize.height / 2 + (Math.random() * windowSize.height - windowSize.height / 2),
            rotate: Math.random() * 360
          }}
          transition={{ duration: 1.5 + Math.random() * 1, ease: 'easeOut' }}
          className="fixed pointer-events-none text-4xl z-0"
        >
          {['💥', '🎉', '🎂', '✨', '🎈'][i % 5]}
        </motion.div>
      ))}

      <div className="min-h-full flex flex-col items-center justify-start py-12 px-4 relative z-10">
        {/* Result card */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="text-center mb-12">
          <div className="text-7xl mb-4">{grade.emoji}</div>
          <h1 className="text-4xl font-black text-white mb-2">{grade.label}</h1>
          {myResult && (
            <>
              <p className="text-theme-secondary mb-4">You scored <span className="text-white font-black">{myResult.score.toLocaleString()} points</span></p>
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-strong">
                <Trophy className="w-5 h-5 text-warning-400" />
                <span className="text-xl font-black text-white">Rank #{myResult.rank}</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Podium */}
        {top3.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-end justify-center gap-4 mb-12 w-full max-w-sm">
            {/* 2nd place */}
            <div className="flex flex-col items-center gap-2">
              <Avatar seed={top3[1]?.avatar_seed ?? 'b'} size="md" border />
              <p className="text-xs font-bold text-white truncate max-w-16 text-center">{top3[1]?.display_name}</p>
              <p className="text-sm font-black text-theme-secondary">{top3[1]?.score.toLocaleString()}</p>
              <div className="podium-2 w-20 rounded-t-xl flex items-end justify-center pb-2">
                <span className="text-2xl font-black text-white">2</span>
              </div>
            </div>
            {/* 1st place */}
            <div className="flex flex-col items-center gap-2">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="text-3xl">👑</span>
              </motion.div>
              <Avatar seed={top3[0]?.avatar_seed ?? 'a'} size="lg" border />
              <p className="text-sm font-bold text-white truncate max-w-20 text-center">{top3[0]?.display_name}</p>
              <p className="text-sm font-black text-warning-400">{top3[0]?.score.toLocaleString()}</p>
              <div className="podium-1 w-24 rounded-t-xl flex items-end justify-center pb-2">
                <span className="text-3xl font-black text-white">1</span>
              </div>
            </div>
            {/* 3rd place */}
            <div className="flex flex-col items-center gap-2">
              <Avatar seed={top3[2]?.avatar_seed ?? 'c'} size="md" border />
              <p className="text-xs font-bold text-white truncate max-w-16 text-center">{top3[2]?.display_name}</p>
              <p className="text-sm font-black text-theme-secondary">{top3[2]?.score.toLocaleString()}</p>
              <div className="podium-3 w-20 rounded-t-xl flex items-end justify-center pb-2">
                <span className="text-2xl font-black text-white">3</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full leaderboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full max-w-md space-y-2 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 text-center">Full Rankings</h2>
          {leaderboard.map((e: any, i) => (
            <div key={e.id} className={cn('flex items-center gap-3 p-3 rounded-xl', e.student_id === profile?.id ? 'glass-strong border border-brand-500' : 'glass')}>
              <span className="text-lg w-8 text-center font-black text-theme-secondary">{i + 1}</span>
              <Avatar seed={e.avatar_seed} size="sm" />
              <span className="flex-1 font-medium text-white truncate">{e.display_name}</span>
              <span className="font-black text-brand-400">{e.score.toLocaleString()}</span>
              {e.student_id === profile?.id && <Star className="w-4 h-4 text-warning-400 flex-shrink-0" />}
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link to="/student">
            <Button variant="outline" leftIcon={<Home className="w-4 h-4" />}>Dashboard</Button>
          </Link>
          <Link to="/student/join">
            <Button leftIcon={<RotateCcw className="w-4 h-4" />}>Play Again</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
