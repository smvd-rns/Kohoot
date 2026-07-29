import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit, Trash2, Copy, Play, MoreVertical, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card, Badge, EmptyState, Modal, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { quizService } from '@/services/quiz.service'
import { getTheme, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Quiz } from '@/types'

export default function QuizzesPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteModal, setDeleteModal] = useState<Quiz | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    loadQuizzes()
  }, [profile?.id])

  const loadQuizzes = async () => {
    if (!profile?.id) return
    try {
      const data = await quizService.listQuizzes(profile.id)
      setQuizzes(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!profile?.id) return
    setCreating(true)
    try {
      const quiz = await quizService.createQuiz(profile.id, {
        title: 'New Quiz',
        theme: 'modern',
        time_per_question: 30,
        passing_score: 60,
        shuffle_questions: false,
        shuffle_options: false,
        show_leaderboard: true,
        enable_music: false,
        enable_animations: true,
        auto_submit: true,
        allow_retakes: true,
        max_attempts: 3,
      })
      navigate(`/admin/quizzes/${quiz.id}/edit`)
    } catch { toast.error('Failed to create quiz') } finally { setCreating(false) }
  }

  const handleDelete = async (quiz: Quiz) => {
    try {
      await quizService.deleteQuiz(quiz.id)
      setQuizzes(q => q.filter(x => x.id !== quiz.id))
      toast.success('Quiz deleted')
    } catch { toast.error('Delete failed') }
    setDeleteModal(null)
  }

  const handleDuplicate = async (quiz: Quiz) => {
    if (!profile?.id) return
    try {
      const copy = await quizService.duplicateQuiz(quiz.id, profile.id)
      setQuizzes(q => [copy, ...q])
      toast.success('Quiz duplicated!')
    } catch { toast.error('Duplicate failed') }
    setMenuOpen(null)
  }

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      await quizService.publishQuiz(quiz.id, !quiz.is_published)
      setQuizzes(q => q.map(x => x.id === quiz.id ? { ...x, is_published: !x.is_published } : x))
      toast.success(quiz.is_published ? 'Quiz unpublished' : 'Quiz published!')
    } catch { toast.error('Failed to update') }
    setMenuOpen(null)
  }

  const filtered = quizzes.filter(q => q.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-theme-primary">My Quizzes</h1>
          <p className="text-theme-secondary text-sm mt-1">{quizzes.length} quizzes total</p>
        </div>
        <Button onClick={handleCreate} isLoading={creating} leftIcon={<Plus className="w-4 h-4" />}>
          Create Quiz
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search quizzes..."
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Quizzes grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📝" title={search ? 'No quizzes found' : 'No quizzes yet'} description={search ? 'Try a different search' : 'Create your first quiz to get started!'} action={!search ? <Button onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>Create Quiz</Button> : undefined} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((quiz, i) => {
              const theme = getTheme(quiz.theme)
              return (
                <motion.div
                  key={quiz.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card hover className="relative overflow-hidden group h-full flex flex-col">
                    {/* Theme gradient bar */}
                    <div className="h-1 absolute top-0 left-0 right-0 rounded-t-2xl" style={{ background: theme.gradient }} />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-4 pt-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: theme.gradient }}>
                        {theme.emoji}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === quiz.id ? null : quiz.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-theme-secondary"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {menuOpen === quiz.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute right-0 top-8 z-20 glass-strong rounded-xl shadow-xl min-w-44 py-1 border border-theme"
                              onClick={e => e.stopPropagation()}
                            >
                              {[
                                { icon: Edit,    label: 'Edit',      action: () => navigate(`/admin/quizzes/${quiz.id}/edit`) },
                                { icon: Copy,    label: 'Duplicate', action: () => handleDuplicate(quiz) },
                                { icon: quiz.is_published ? EyeOff : Eye, label: quiz.is_published ? 'Unpublish' : 'Publish', action: () => handleTogglePublish(quiz) },
                                { icon: Trash2,  label: 'Delete',    action: () => { setDeleteModal(quiz); setMenuOpen(null) }, danger: true },
                              ].map(m => (
                                <button key={m.label} onClick={m.action} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors', m.danger && 'text-danger-400')}>
                                  <m.icon className="w-4 h-4" />{m.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="font-bold text-theme-primary mb-1 truncate">{quiz.title}</h3>
                      {quiz.description && <p className="text-xs text-theme-secondary mb-3 line-clamp-2">{quiz.description}</p>}
                      <div className="flex flex-wrap gap-2 text-xs text-theme-secondary mb-4">
                        <span>📝 {quiz.question_count} questions</span>
                        <span>▶ {quiz.total_plays} plays</span>
                        <span>📅 {formatDate(quiz.created_at)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-theme">
                      <Badge variant={quiz.is_published ? 'success' : 'default'}>
                        {quiz.is_published ? '● Published' : '○ Draft'}
                      </Badge>
                      <div className="flex gap-2">
                        <Link to={`/admin/quizzes/${quiz.id}/edit`}>
                          <Button variant="ghost" size="xs" leftIcon={<Edit className="w-3 h-3" />}>Edit</Button>
                        </Link>
                        <Link to={`/admin/sessions?quiz=${quiz.id}`}>
                          <Button size="xs" leftIcon={<Play className="w-3 h-3" />}>Launch</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Quiz">
        <p className="text-theme-secondary mb-6">
          Are you sure you want to delete <strong className="text-theme-primary">"{deleteModal?.title}"</strong>?
          This will also delete all questions and session data. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal)} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
