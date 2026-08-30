import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Avatar, EmptyState, Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { quizService } from '@/services/quiz.service'
import { timeAgo, getTheme } from '@/lib/utils'

export default function HistoryPage() {
  const { profile } = useAuthStore()
  const [history, setHistory] = useState<unknown[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
          <div className="space-y-3">
            {(history.slice((currentPage - 1) * pageSize, currentPage * pageSize) as Array<{ id: string; score: number; correct_answers: number; wrong_answers: number; joined_at: string; session: { title?: string; room_code: string; quiz: { title: string; theme: string; question_count?: number } } }>).map((h, i) => {
              const theme = getTheme(h.session?.quiz?.theme as never ?? 'modern')
            return (
              <motion.div key={h.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: theme.gradient }}>{theme.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-theme-primary">{h.session?.title || h.session?.quiz?.title || 'Quiz'}</p>
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

          {/* Pagination Controls */}
          {history.length > 0 && (
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
                  Page <strong>{currentPage}</strong> of <strong>{Math.ceil(history.length / pageSize) || 1}</strong> ({history.length} entries)
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
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(history.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(history.length / pageSize) || Math.ceil(history.length / pageSize) === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
