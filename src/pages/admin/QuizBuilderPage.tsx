import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Save, ArrowLeft, Trash2, GripVertical, ChevronRight,
  Image, Mic, Video, CheckSquare, Type, ToggleLeft, BarChart2,
  Puzzle, MessageSquare, Settings, Eye,
} from 'lucide-react'
import { Button, Input, Textarea, Select, Toggle, Card, Badge, Spinner } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { QUESTION_TYPE_LABELS, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Quiz, Question, AnswerOption, QuestionType } from '@/types'

// ── Question type icons ──────────────────────────────────────────────────────
const qTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  multi_select:    CheckSquare,
  fill_blank:      Type,
  image_based:     Image,
  audio_based:     Mic,
  video_based:     Video,
  poll:            BarChart2,
  puzzle:          Puzzle,
  open_ended:      MessageSquare,
}

const qTypeColors: Record<QuestionType, string> = {
  multiple_choice: '#7c6fef',
  true_false:      '#22c55e',
  multi_select:    '#6366f1',
  fill_blank:      '#f97316',
  image_based:     '#ec4899',
  audio_based:     '#8b5cf6',
  video_based:     '#ef4444',
  poll:            '#eab308',
  puzzle:          '#06b6d4',
  open_ended:      '#64748b',
}

// ── Sortable question item ───────────────────────────────────────────────────
function SortableQuestion({ q, isSelected, onSelect, onDelete }: { q: Question; isSelected: boolean; onSelect: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id })
  const Icon = qTypeIcons[q.type]
  const color = qTypeColors[q.type]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }}
      className={cn('flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border', isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-transparent hover:bg-white/5 glass', isDragging && 'shadow-glow opacity-90')}
      onClick={onSelect}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-theme-secondary p-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-theme-primary truncate">{q.text || 'Untitled question'}</p>
        <p className="text-xs text-theme-secondary">{QUESTION_TYPE_LABELS[q.type]}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="p-1 rounded hover:bg-danger-500/20 text-danger-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Option editor ────────────────────────────────────────────────────────────
function OptionEditor({ options, onChange, multiCorrect = false }: { options: Partial<AnswerOption>[]; onChange: (opts: Partial<AnswerOption>[]) => void; multiCorrect?: boolean }) {
  const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#7c6fef', '#f928b8']

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
          <Input
            value={opt.text ?? ''}
            onChange={e => {
              const next = [...options]; next[i] = { ...next[i], text: e.target.value }; onChange(next)
            }}
            placeholder={`Option ${i + 1}`}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const next = [...options]
              if (multiCorrect) next[i] = { ...next[i], is_correct: !next[i].is_correct }
              else next.forEach((o, j) => { next[j] = { ...o, is_correct: j === i } })
              onChange(next)
            }}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', opt.is_correct ? 'bg-success-500/20 text-success-400 border border-success-500' : 'bg-white/5 text-theme-secondary border border-transparent')}
          >
            {opt.is_correct ? '✓ Correct' : 'Mark correct'}
          </button>
          {options.length > 2 && (
            <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-danger-400 hover:bg-danger-500/10 p-1 rounded">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button
          type="button"
          onClick={() => onChange([...options, { text: '', is_correct: false, order_index: options.length }])}
          className="text-xs text-brand-400 hover:underline flex items-center gap-1 mt-1"
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
      )}
    </div>
  )
}

// ── Question editor panel ─────────────────────────────────────────────────────
function QuestionEditor({ question, onUpdate, onSaveOptions }: { question: Question; onUpdate: (q: Partial<Question>) => void; onSaveOptions: (opts: Partial<AnswerOption>[]) => void }) {
  const [options, setOptions] = useState<Partial<AnswerOption>[]>(
    question.answer_options?.length
      ? question.answer_options
      : [{ text: '', is_correct: true, order_index: 0 }, { text: '', is_correct: false, order_index: 1 }, { text: '', is_correct: false, order_index: 2 }, { text: '', is_correct: false, order_index: 3 }]
  )

  const needsOptions = ['multiple_choice', 'true_false', 'multi_select', 'poll'].includes(question.type)
  const isTrueFalse  = question.type === 'true_false'

  useEffect(() => {
    if (isTrueFalse) {
      setOptions([{ text: 'True', is_correct: true, order_index: 0 }, { text: 'False', is_correct: false, order_index: 1 }])
    }
  }, [isTrueFalse, question.id])

  return (
    <div className="space-y-6">
      {/* Question type */}
      <Select
        label="Question Type"
        value={question.type}
        onChange={e => onUpdate({ type: e.target.value as QuestionType })}
        options={Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
      />

      {/* Question text */}
      <Textarea
        label="Question Text"
        value={question.text}
        onChange={e => onUpdate({ text: e.target.value })}
        placeholder="Enter your question here..."
        className="min-h-[120px]"
      />

      {/* Media URL */}
      {['image_based', 'audio_based', 'video_based'].includes(question.type) && (
        <Input
          label={`${question.type === 'image_based' ? 'Image' : question.type === 'audio_based' ? 'Audio' : 'Video'} URL`}
          value={question.media_url ?? ''}
          onChange={e => onUpdate({ media_url: e.target.value })}
          placeholder="https://..."
        />
      )}

      {/* Fill blank answer */}
      {question.type === 'fill_blank' && (
        <Input
          label="Correct Answer"
          value={question.blank_answer ?? ''}
          onChange={e => onUpdate({ blank_answer: e.target.value })}
          placeholder="The expected answer..."
        />
      )}

      {/* Puzzle items */}
      {question.type === 'puzzle' && (
        <div>
          <p className="text-sm font-medium text-theme-secondary mb-2">Items to arrange (in correct order)</p>
          {(question.puzzle_items ?? ['', '', '']).map((item, i) => (
            <Input
              key={i}
              value={item}
              onChange={e => {
                const items = [...(question.puzzle_items ?? [])]
                items[i] = e.target.value
                onUpdate({ puzzle_items: items })
              }}
              placeholder={`Item ${i + 1}`}
              className="mb-2"
            />
          ))}
          <button type="button" className="text-xs text-brand-400 hover:underline" onClick={() => onUpdate({ puzzle_items: [...(question.puzzle_items ?? []), ''] })}>
            + Add item
          </button>
        </div>
      )}

      {/* Options */}
      {needsOptions && !isTrueFalse && (
        <div>
          <p className="text-sm font-medium text-theme-secondary mb-3">Answer Options</p>
          <OptionEditor 
            options={options} 
            onChange={(opts) => {
              setOptions(opts)
              onUpdate({ answer_options: opts as AnswerOption[] })
            }} 
            multiCorrect={question.type === 'multi_select'} 
          />
        </div>
      )}
      {isTrueFalse && (
        <div>
          <p className="text-sm font-medium text-theme-secondary mb-3">Correct Answer</p>
          <div className="flex gap-3">
            {['True', 'False'].map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  const next = [{ text: 'True', is_correct: v === 'True', order_index: 0 }, { text: 'False', is_correct: v === 'False', order_index: 1 }]
                  setOptions(next)
                  onUpdate({ answer_options: next as AnswerOption[] })
                }}
                className={cn('flex-1 py-3 rounded-xl font-bold transition-all border', options[i]?.is_correct ? 'bg-success-500/20 border-success-500 text-success-400' : 'glass border-theme text-theme-secondary')}
              >
                {v === 'True' ? '✅ True' : '❌ False'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-theme-secondary mb-1 block">Time Limit (seconds)</label>
          <input
            type="number"
            min={5}
            max={300}
            value={question.time_limit}
            onChange={e => onUpdate({ time_limit: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-theme-secondary mb-1 block">Points</label>
          <input
            type="number"
            min={0}
            max={1000}
            step={50}
            value={question.points}
            onChange={e => onUpdate({ points: Number(e.target.value) })}
            className="input-field"
          />
        </div>
      </div>

      {/* Explanation */}
      <Textarea
        label="Explanation (shown after answer)"
        value={question.explanation ?? ''}
        onChange={e => onUpdate({ explanation: e.target.value })}
        placeholder="Optional: explain why this is the correct answer..."
        className="min-h-[80px]"
      />
    </div>
  )
}

// ── Main builder page ─────────────────────────────────────────────────────────
export default function QuizBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'questions' | 'settings'>('questions')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (!id) return
    quizService.getQuiz(id).then(q => {
      setQuiz(q)
      setQuestions(q.questions ?? [])
      if (q.questions?.length) setSelectedId(q.questions[0].id)
    }).finally(() => setLoading(false))
  }, [id])

  const selectedQuestion = questions.find(q => q.id === selectedId) ?? null

  const handleAddQuestion = async () => {
    if (!quiz) return
    try {
      const q = await quizService.createQuestion(quiz.id, {
        type: 'multiple_choice',
        text: '',
        time_limit: quiz.time_per_question,
        points: 100,
        is_required: true,
      })
      setQuestions(qs => [...qs, q])
      setSelectedId(q.id)
    } catch { toast.error('Failed to add question') }
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!quiz) return
    try {
      await quizService.deleteQuestion(qId, quiz.id)
      setQuestions(qs => {
        const next = qs.filter(q => q.id !== qId)
        if (selectedId === qId) setSelectedId(next[0]?.id ?? null)
        return next
      })
    } catch { toast.error('Failed to delete question') }
  }

  const handleUpdateQuestion = useCallback(async (updates: Partial<Question>) => {
    if (!selectedId) return
    
    // Extract answer_options since it belongs to a different table
    const { answer_options, ...qUpdates } = updates
    
    setQuestions(qs => qs.map(q => q.id === selectedId ? { ...q, ...updates } : q))
    
    try {
      if (Object.keys(qUpdates).length > 0) {
        await quizService.updateQuestion(selectedId, qUpdates)
      }
      if (answer_options) {
        await quizService.upsertOptions(selectedId, answer_options)
      }
    } catch { toast.error('Auto-save failed') }
  }, [selectedId])

  const handleSaveOptions = async (opts: Partial<AnswerOption>[]) => {
    if (!selectedId) return
    try {
      await quizService.upsertOptions(selectedId, opts)
      setQuestions(qs => qs.map(q => q.id === selectedId ? { ...q, answer_options: opts as AnswerOption[] } : q))
      toast.success('Options saved')
    } catch { toast.error('Failed to save options') }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions(qs => {
        const oldIndex = qs.findIndex(q => q.id === active.id)
        const newIndex = qs.findIndex(q => q.id === over.id)
        const reordered = arrayMove(qs, oldIndex, newIndex).map((q, i) => ({ ...q, order_index: i }))
        quizService.reorderQuestions(reordered.map(q => ({ id: q.id, order_index: q.order_index }))).catch(() => {})
        return reordered
      })
    }
  }

  const handleSaveQuiz = async () => {
    if (!quiz) return
    setSaving(true)
    try {
      await quizService.updateQuiz(quiz.id, { title: quiz.title, description: quiz.description })
      toast.success('Quiz saved!')
    } catch { toast.error('Save failed') } finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 lg:-mx-6 overflow-hidden">
      {/* ── Left panel: question list ─────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col glass border-r border-theme">
        {/* Quiz title header */}
        <div className="p-4 border-b border-theme">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => navigate('/admin/quizzes')} className="p-1.5 rounded-lg hover:bg-white/10 text-theme-secondary">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                value={quiz?.title ?? ''}
                onChange={e => setQuiz(q => q ? { ...q, title: e.target.value } : q)}
                className="w-full bg-transparent text-sm font-bold text-theme-primary outline-none truncate"
                placeholder="Quiz title..."
              />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg glass">
            {(['questions', 'settings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize', tab === t ? 'bg-brand-500 text-white' : 'text-theme-secondary')}>
                {t === 'questions' ? <span className="flex items-center justify-center gap-1"><CheckSquare className="w-3 h-3" />{t}</span> : <span className="flex items-center justify-center gap-1"><Settings className="w-3 h-3" />{t}</span>}
              </button>
            ))}
          </div>
        </div>

        {tab === 'questions' ? (
          <>
            {/* Question list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar group">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence>
                    {questions.map(q => (
                      <SortableQuestion
                        key={q.id}
                        q={q}
                        isSelected={q.id === selectedId}
                        onSelect={() => setSelectedId(q.id)}
                        onDelete={() => handleDeleteQuestion(q.id)}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
              {questions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="text-xs text-theme-secondary">No questions yet. Add one!</p>
                </div>
              )}
            </div>

            {/* Add question */}
            <div className="p-3 border-t border-theme">
              <Button className="w-full" size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddQuestion}>
                Add Question
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider">Quiz Settings</p>
            <Input label="Description" value={quiz?.description ?? ''} onChange={e => setQuiz(q => q ? { ...q, description: e.target.value } : q)} placeholder="Quiz description..." />
            <Input label="Category" value={quiz?.category ?? ''} onChange={e => setQuiz(q => q ? { ...q, category: e.target.value } : q)} placeholder="e.g. Science, Math..." />
          </div>
        )}
      </div>

      {/* ── Center/right: question editor ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-theme glass">
          <div className="flex items-center gap-3">
            <span className="text-sm text-theme-secondary">{questions.length} questions</span>
            {selectedQuestion && (
              <>
                <span className="text-theme-secondary">·</span>
                <Badge variant="purple">{QUESTION_TYPE_LABELS[selectedQuestion.type]}</Badge>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Eye className="w-4 h-4" />} onClick={() => navigate(`/admin/quizzes/${id}/settings`)}>
              Settings
            </Button>
            <Button size="sm" leftIcon={<Save className="w-4 h-4" />} isLoading={saving} onClick={handleSaveQuiz}>
              Save
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedQuestion ? (
            <motion.div key={selectedQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme">
                  {(() => { const Icon = qTypeIcons[selectedQuestion.type]; const color = qTypeColors[selectedQuestion.type]; return <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}><Icon className="w-5 h-5" style={{ color }} /></div> })()}
                  <div>
                    <h2 className="font-bold text-theme-primary">Question {questions.findIndex(q => q.id === selectedId) + 1}</h2>
                    <p className="text-xs text-theme-secondary">{QUESTION_TYPE_LABELS[selectedQuestion.type]}</p>
                  </div>
                </div>
                <QuestionEditor
                  question={selectedQuestion}
                  onUpdate={handleUpdateQuestion}
                  onSaveOptions={handleSaveOptions}
                />
              </Card>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-xl font-bold text-theme-primary mb-2">Start building your quiz</h2>
              <p className="text-theme-secondary mb-6">Add questions from the left panel</p>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddQuestion}>Add First Question</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
