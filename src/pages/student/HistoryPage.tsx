import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Avatar, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { quizService } from '@/services/quiz.service'
import { timeAgo, getTheme } from '@/lib/utils'

export default function HistoryPage() {
  const { profile } = useAuthStore()
  const [history, setHistory] = useState<unknown[]>([])

  useEffect(() => {
    if (!profile?.id) return
    quizService.getStudentHistory(profile.id).then(setHistory)
  }, [profile?.id])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">Quiz History</h1>
      {history.length === 0 ? (
        <EmptyState icon="📋" title="No history yet" description="Join a quiz to start tracking your progress" />
      ) : (
        <div className="space-y-3">
          {(history as Array<{ id: string; score: number; correct_answers: number; wrong_answers: number; joined_at: string; session: { room_code: string; quiz: { title: string; theme: string; question_count?: number } } }>).map((h, i) => {
            const theme = getTheme(h.session?.quiz?.theme as never ?? 'modern')
            return (
              <motion.div key={h.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: theme.gradient }}>{theme.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-theme-primary">{h.session?.quiz?.title ?? 'Quiz'}</p>
                      <p className="text-xs text-theme-secondary">{timeAgo(h.joined_at)}</p>
                      <div className="flex gap-3 mt-1 text-xs text-theme-secondary">
                        <span>✅ {h.correct_answers} correct</span>
                        <span>❌ {h.wrong_answers} wrong</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black gradient-text">{h.score.toLocaleString()}</p>
                      <p className="text-xs text-theme-secondary">points</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
