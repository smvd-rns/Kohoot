import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Settings, Plus, Trash2, GripVertical } from 'lucide-react'
import { Button, Input, Select, Toggle, Card, Spinner } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { THEMES } from '@/lib/utils'
import { BACKGROUND_MUSIC } from '@/lib/music'
import toast from 'react-hot-toast'
import type { Quiz, CustomField, FieldType } from '@/types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'number',   label: 'Number' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio',    label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
]

export default function QuizSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [customFields, setCustomFields] = useState<Partial<CustomField>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([quizService.getQuiz(id), quizService.getCustomFields(id)])
      .then(([q, fields]) => { setQuiz(q); setCustomFields(fields) })
      .finally(() => setLoading(false))
  }, [id])

  const update = (key: keyof Quiz, value: unknown) => setQuiz(q => q ? { ...q, [key]: value } : q)

  const handleSave = async () => {
    if (!quiz || !id) return
    setSaving(true)
    try {
      // Omit nested relations and immutable fields that would cause Supabase to reject the update
      const { questions, custom_fields, id: _id, created_at, admin_id, ...quizData } = quiz as any
      
      const sanitizedFields = customFields.map((f: any) => {
        const { id, created_at, ...rest } = f
        return rest
      })

      await Promise.all([
        quizService.updateQuiz(id, quizData),
        quizService.upsertCustomFields(id, sanitizedFields),
      ])
      toast.success('Settings saved!')
    } catch (err: any) { 
      console.error('Save failed:', err)
      toast.error('Save failed: ' + (err.message || 'Unknown error'))
    } finally { 
      setSaving(false) 
    }
  }

  const addField = () => {
    setCustomFields(f => [...f, { label: '', field_type: 'text', is_required: false, order_index: f.length }])
  }

  const removeField = (i: number) => setCustomFields(f => f.filter((_, j) => j !== i))

  const updateField = (i: number, key: string, val: unknown) => {
    setCustomFields(f => f.map((field, j) => j === i ? { ...field, [key]: val } : field))
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/admin/quizzes/${id}/edit`)} className="p-2 rounded-xl hover:bg-white/10 text-theme-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-theme-primary">Quiz Settings</h1>
          <p className="text-theme-secondary text-sm">{quiz?.title}</p>
        </div>
        <Button className="ml-auto" leftIcon={<Save className="w-4 h-4" />} isLoading={saving} onClick={handleSave}>Save</Button>
      </div>

      {/* General settings */}
      <Card>
        <h2 className="text-lg font-bold text-theme-primary mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-brand-400" /> General</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-theme-secondary mb-1 block">Time per question (sec)</label>
              <input type="number" min={5} max={300} value={quiz?.time_per_question ?? 30} onChange={e => update('time_per_question', Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-theme-secondary mb-1 block">Passing Score (%)</label>
              <input type="number" min={0} max={100} value={quiz?.passing_score ?? 60} onChange={e => update('passing_score', Number(e.target.value))} className="input-field" />
            </div>
          </div>

          <Select
            label="Quiz Theme"
            value={quiz?.theme ?? 'modern'}
            onChange={e => update('theme', e.target.value)}
            options={THEMES.map(t => ({ value: t.id, label: `${t.emoji} ${t.name}` }))}
          />

          <div className="space-y-2">
            <Select
              label="Background Music"
              value={quiz?.background_music_url ?? ''}
              onChange={e => update('background_music_url', e.target.value)}
              options={BACKGROUND_MUSIC.map(m => ({ value: m.url, label: m.label }))}
            />
            {quiz?.background_music_url && (
              <audio key={quiz.background_music_url} controls src={quiz.background_music_url} className="w-full h-10 mt-2" />
            )}
          </div>
          <Input label="Background Image URL" value={quiz?.background_image_url ?? ''} onChange={e => update('background_image_url', e.target.value)} placeholder="https://..." />
        </div>
      </Card>

      {/* Toggle settings */}
      <Card>
        <h2 className="text-lg font-bold text-theme-primary mb-6">Behaviour</h2>
        <div className="space-y-5">
          {([
            ['shuffle_questions', 'Shuffle Questions',  'Randomize question order for each student'],
            ['shuffle_options',   'Shuffle Options',    'Randomize answer option order'],
            ['show_leaderboard',  'Show Leaderboard',   'Display real-time leaderboard between questions'],
            ['enable_music',      'Background Music',   'Play background music during the quiz'],
            ['enable_animations', 'Animations',         'Enable celebration and transition animations'],
            ['auto_submit',       'Auto Submit',         'Automatically submit when timer runs out'],
            ['allow_retakes',     'Allow Retakes',      'Students can attempt the quiz multiple times'],
          ] as [keyof Quiz, string, string][]).map(([key, label, desc]) => (
            <Toggle
              key={key}
              checked={!!((quiz as unknown as Record<string, unknown>)?.[key])}
              onChange={v => update(key, v)}
              label={label}
              description={desc}
            />
          ))}
        </div>
      </Card>

      {/* Custom registration fields */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-theme-primary">Registration Fields</h2>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={addField}>Add Field</Button>
        </div>
        <p className="text-sm text-theme-secondary mb-4">Students will fill these fields before joining the quiz.</p>
        {customFields.length === 0 ? (
          <p className="text-sm text-theme-secondary text-center py-6">No custom fields. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {customFields.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 glass rounded-xl">
                <GripVertical className="w-4 h-4 text-theme-secondary cursor-grab flex-shrink-0" />
                <Input value={f.label ?? ''} onChange={e => updateField(i, 'label', e.target.value)} placeholder="Field label (e.g. School Name)" className="flex-1" />
                <Select value={f.field_type ?? 'text'} onChange={e => updateField(i, 'field_type', e.target.value)} options={FIELD_TYPES} className="w-36" />
                <Toggle checked={f.is_required ?? false} onChange={v => updateField(i, 'is_required', v)} label="" />
                <span className="text-xs text-theme-secondary whitespace-nowrap">Required</span>
                <button onClick={() => removeField(i)} className="text-danger-400 hover:bg-danger-500/10 p-1 rounded flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
