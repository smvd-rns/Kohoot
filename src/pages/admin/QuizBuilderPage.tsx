import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Save, ArrowLeft, Trash2, GripVertical, ChevronRight,
  Image, Video, CheckSquare, Type, ToggleLeft, BarChart2,
  MessageSquare, Settings, Eye, Edit2,
} from 'lucide-react'
import { Button, Input, Textarea, Select, Toggle, Card, Badge, Spinner } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { QUESTION_TYPE_LABELS, cn, getEmbedUrl } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Quiz, Question, AnswerOption, QuestionType } from '@/types'

// ── Question type icons ──────────────────────────────────────────────────────
const qTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  multi_select:    CheckSquare,
  fill_blank:      Type,
  image_based:     Image,
  video_based:     Video,
  poll:            BarChart2,
  open_ended:      MessageSquare,
}

const qTypeColors: Record<QuestionType, string> = {
  multiple_choice: '#7c6fef',
  true_false:      '#22c55e',
  multi_select:    '#6366f1',
  fill_blank:      '#f97316',
  image_based:     '#ec4899',
  video_based:     '#ef4444',
  poll:            '#eab308',
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
function OptionEditor({ 
  options, 
  onChange, 
  multiCorrect = false, 
  customWeighting = false 
}: { 
  options: Partial<AnswerOption>[]; 
  onChange: (opts: Partial<AnswerOption>[]) => void; 
  multiCorrect?: boolean; 
  customWeighting?: boolean 
}) {
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
          {customWeighting ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={opt.weight ?? (opt.is_correct ? 100 : 0)}
                  onChange={e => {
                    const otherSum = options.reduce((sum, o, idx) => idx === i ? sum : sum + (o.weight ?? (o.is_correct ? 100 : 0)), 0)
                    const maxAllowed = multiCorrect ? Math.max(0, 100 - otherSum) : 100
                    const val = Math.min(maxAllowed, Math.max(0, Number(e.target.value) || 0))
                    const next = [...options]
                    next[i] = { ...next[i], weight: val, is_correct: val > 0 }
                    onChange(next)
                  }}
                  className="w-10 bg-transparent text-center focus:outline-none text-xs font-black text-brand-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-theme-secondary font-black">%</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = [...options]
                  const currentWeight = next[i].weight ?? (next[i].is_correct ? 100 : 0)
                  const otherSum = options.reduce((sum, o, idx) => idx === i ? sum : sum + (o.weight ?? (o.is_correct ? 100 : 0)), 0)
                  const maxAllowed = multiCorrect ? Math.max(0, 100 - otherSum) : 100
                  const newVal = currentWeight > 0 ? 0 : maxAllowed
                  next[i] = { ...next[i], weight: newVal, is_correct: newVal > 0 }
                  onChange(next)
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  (opt.weight ?? (opt.is_correct ? 100 : 0)) > 0
                    ? 'bg-success-500/20 text-success-400 border-success-500'
                    : 'bg-white/5 text-theme-secondary border-transparent'
                )}
                title={(opt.weight ?? (opt.is_correct ? 100 : 0)) > 0 ? 'Mark incorrect (0%)' : 'Mark correct (100%)'}
              >
                {(opt.weight ?? (opt.is_correct ? 100 : 0)) > 0 ? '✓' : '✗'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                const next = [...options]
                if (multiCorrect) {
                  const nextVal = !next[i].is_correct
                  next[i] = { ...next[i], is_correct: nextVal, weight: nextVal ? 100 : 0 }
                } else {
                  next.forEach((o, j) => {
                    next[j] = { ...o, is_correct: j === i, weight: j === i ? 100 : 0 }
                  })
                }
                onChange(next)
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                opt.is_correct
                  ? 'bg-success-500/20 text-success-400 border border-success-500'
                  : 'bg-white/5 text-theme-secondary border border-transparent'
              )}
            >
              {opt.is_correct ? '✓ Correct' : 'Mark correct'}
            </button>
          )}
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
          onClick={() => onChange([...options, { text: '', is_correct: false, weight: 0, order_index: options.length }])}
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

  const needsOptions = ['multiple_choice', 'true_false', 'multi_select', 'poll', 'image_based', 'video_based'].includes(question.type)
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
      {['image_based', 'video_based'].includes(question.type) && (
        <div className="space-y-4">
          <Input
            label={`${question.type === 'image_based' ? 'Image' : 'Video'} URL`}
            value={question.media_url ?? ''}
            onChange={e => {
              const url = e.target.value;
              onUpdate({ media_url: url, media_type: question.type === 'image_based' ? 'image' : 'video' })
            }}
            placeholder={question.type === 'video_based' ? 'Paste YouTube, Vimeo, or MP4 URL...' : 'Paste image URL...'}
          />
          {question.media_url && (
            <div className="mt-2 rounded-xl overflow-hidden glass border border-theme bg-black/10 flex items-center justify-center p-2 h-48 relative">
              {question.type === 'image_based' ? (
                <img src={question.media_url} alt="Preview" className="max-h-full object-contain" />
              ) : (
                <iframe
                  src={getEmbedUrl(question.media_url) || question.media_url}
                  className="w-full h-full rounded-lg"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}
        </div>
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



      {/* Options */}
      {needsOptions && !isTrueFalse && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-theme-secondary">Answer Options</p>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-theme-secondary font-bold hover:text-theme-primary transition-colors">
              <input
                type="checkbox"
                checked={question.custom_weighting ?? false}
                onChange={e => {
                  const checked = e.target.checked
                  let updatedOptions: Partial<AnswerOption>[] = []
                  
                  if (checked) {
                    const correctCount = options.filter(o => o.is_correct).length
                    const equalWeight = correctCount > 0 ? Math.floor(100 / correctCount) : 0
                    let allocatedSum = 0
                    
                    updatedOptions = options.map((o, idx) => {
                      if (o.is_correct) {
                        const isLastCorrect = options.slice(idx + 1).filter(rest => rest.is_correct).length === 0
                        const w = isLastCorrect ? (100 - allocatedSum) : equalWeight
                        allocatedSum += w
                        return { ...o, weight: w, is_correct: w > 0 }
                      }
                      return { ...o, weight: 0, is_correct: false }
                    })
                  } else {
                    updatedOptions = options.map(o => {
                      const currentWeight = o.weight ?? (o.is_correct ? 100 : 0)
                      return {
                        ...o,
                        weight: undefined,
                        is_correct: currentWeight > 0
                      }
                    })
                  }
                  
                  setOptions(updatedOptions)
                  onUpdate({ 
                    custom_weighting: checked,
                    answer_options: updatedOptions as AnswerOption[]
                  })
                }}
                className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 w-3.5 h-3.5"
              />
              Enable Custom Weighting (Percentages)
            </label>
          </div>
          <OptionEditor 
            options={options} 
            onChange={(opts) => {
              setOptions(opts)
              onUpdate({ answer_options: opts as AnswerOption[] })
            }} 
            multiCorrect={question.type === 'multi_select'} 
            customWeighting={question.custom_weighting}
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

  const handleUpdateQuizField = async (key: keyof Quiz, value: any) => {
    if (!quiz) return
    setQuiz(q => q ? { ...q, [key]: value } : q)
    try {
      await quizService.updateQuiz(quiz.id, { [key]: value })
    } catch {
      toast.error('Failed to auto-save')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 lg:-mx-6 overflow-hidden">
      {/* ── Left panel: question list ─────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col glass border-r border-theme">
        {/* Tabs header */}
        <div className="p-4 border-b border-theme">
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
            <Input 
              label="Quiz Title" 
              value={quiz?.title ?? ''} 
              onChange={e => setQuiz(q => q ? { ...q, title: e.target.value } : q)} 
              onBlur={e => handleUpdateQuizField('title', e.target.value)}
              placeholder="Quiz title..." 
            />
            <Input 
              label="Description" 
              value={quiz?.description ?? ''} 
              onChange={e => setQuiz(q => q ? { ...q, description: e.target.value } : q)} 
              onBlur={e => handleUpdateQuizField('description', e.target.value)}
              placeholder="Quiz description..." 
            />
            <Input 
              label="Category" 
              value={quiz?.category ?? ''} 
              onChange={e => setQuiz(q => q ? { ...q, category: e.target.value } : q)} 
              onBlur={e => handleUpdateQuizField('category', e.target.value)}
              placeholder="e.g. Science, Math..." 
            />
          </div>
        )}
      </div>

      {/* ── Center/right: question editor ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-theme glass">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button onClick={() => navigate('/admin/quizzes')} className="p-1.5 rounded-lg hover:bg-white/10 text-theme-secondary flex-shrink-0" title="Back to Quizzes">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-white/10 flex-shrink-0" />
            <div className="flex-1 max-w-md relative group">
              <input
                value={quiz?.title ?? ''}
                onChange={e => setQuiz(q => q ? { ...q, title: e.target.value } : q)}
                onBlur={e => handleUpdateQuizField('title', e.target.value)}
                className="w-full bg-white/5 text-xl font-bold text-theme-primary outline-none border border-theme hover:border-brand-500/50 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2 transition-all pr-10"
                placeholder="Enter Quiz Title..."
                title="Edit Quiz Title"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-4 h-4" />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-theme-secondary flex-shrink-0">
              <span>{questions.length} questions</span>
              {selectedQuestion && (
                <>
                  <span>·</span>
                  <Badge variant="purple">{QUESTION_TYPE_LABELS[selectedQuestion.type]}</Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-4">
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
