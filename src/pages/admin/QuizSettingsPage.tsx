import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Settings, Plus, Trash2, GripVertical } from 'lucide-react'
import { Button, Input, Select, Toggle, Card, Spinner } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { THEMES, getTheme } from '@/lib/utils'
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
        return {
          ...rest,
          allow_custom: !!f.allow_custom,
          custom_label: f.custom_label || null
        }
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

  const activeTheme = getTheme((quiz?.theme ?? 'modern') as any)

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
          <div>
            <label className="text-sm font-medium text-theme-secondary mb-1 block">Quiz Title</label>
            <input
              type="text"
              value={quiz?.title ?? ''}
              onChange={e => update('title', e.target.value)}
              className="input-field font-bold"
              placeholder="Enter quiz title..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-theme-secondary mb-1 block">Quiz Description</label>
            <textarea
              value={quiz?.description ?? ''}
              onChange={e => update('description', e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Enter quiz description..."
            />
          </div>

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

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select
                label="Quiz Theme"
                value={quiz?.theme ?? 'modern'}
                onChange={e => update('theme', e.target.value)}
                options={THEMES.map(t => ({ value: t.id, label: `${t.emoji} ${t.name}` }))}
              />
            </div>
            {/* Real-time Theme Preview Box */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-bold text-theme-secondary uppercase tracking-wider">Live Preview</span>
              <div 
                data-theme={quiz?.theme ?? 'modern'}
                className="w-16 h-11 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-theme transition-all duration-300 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}
              >
                {/* Simulated question card */}
                <div className="glass-strong w-10 h-5 rounded shadow-sm flex items-center justify-center">
                  <span className="text-[10px]">{getTheme((quiz?.theme ?? 'modern') as any).emoji}</span>
                </div>
              </div>
            </div>
          </div>

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-theme-primary">Registration Fields</h2>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={addField}>Add Custom Field</Button>
        </div>
        <p className="text-sm text-theme-secondary mb-6">Students will fill these fields before joining the quiz.</p>

        {/* Common Field Toggles */}
        <div className="bg-white/3 border border-theme rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-theme-secondary mb-1">📝 Common Fields (Recommended)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { label: 'Name', type: 'text' },
              { label: 'Email ID', type: 'email' },
              { label: 'Mobile no', type: 'tel' },
            ] as const).map(common => {
              const isEnabled = customFields.some(f => f.label?.trim().toLowerCase() === common.label.toLowerCase())
              const toggleField = (enable: boolean) => {
                if (enable) {
                  setCustomFields(f => {
                    // Check if already exists to prevent duplicate addition
                    if (f.some(x => x.label?.trim().toLowerCase() === common.label.toLowerCase())) return f
                    return [...f, { label: common.label, field_type: common.type, is_required: true, order_index: f.length }]
                  })
                } else {
                  setCustomFields(f => f.filter(x => x.label?.trim().toLowerCase() !== common.label.toLowerCase()))
                }
              }

              return (
                <div key={common.label} className="flex items-center justify-between p-2.5 glass rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-theme-primary">{common.label}</p>
                    <p className="text-[10px] text-theme-secondary mt-0.5">Collect {common.label.toLowerCase()}</p>
                  </div>
                  <Toggle checked={isEnabled} onChange={toggleField} />
                </div>
              )
            })}
          </div>
        </div>

        {customFields.length === 0 ? (
          <p className="text-sm text-theme-secondary text-center py-6">No custom fields configured. Toggle the common ones or add custom fields above.</p>
        ) : (
          <div className="space-y-4">
            {customFields.map((f, i) => {
              const hasOptions = ['dropdown', 'radio', 'checkbox'].includes(f.field_type ?? '')
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 glass rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-theme-secondary cursor-grab flex-shrink-0" />
                    <Input 
                      value={f.label ?? ''} 
                      onChange={e => updateField(i, 'label', e.target.value)} 
                      placeholder="Field label (e.g. Class, Department)" 
                      className="flex-1" 
                    />
                    <Select 
                      value={f.field_type ?? 'text'} 
                      onChange={e => {
                        const newType = e.target.value
                        updateField(i, 'field_type', newType)
                        if (['dropdown', 'radio', 'checkbox'].includes(newType) && (!f.options || f.options.length === 0)) {
                          updateField(i, 'options', ['Option 1'])
                        }
                      }} 
                      options={FIELD_TYPES} 
                      className="w-36" 
                    />
                    <div className="flex items-center gap-2">
                      <Toggle checked={f.is_required ?? false} onChange={v => updateField(i, 'is_required', v)} label="" />
                      <span className="text-xs text-theme-secondary whitespace-nowrap">Required</span>
                    </div>
                    <button onClick={() => removeField(i)} className="text-danger-400 hover:bg-danger-500/10 p-1.5 rounded-lg flex-shrink-0 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options List editor for list fields (Dropdown, Radio, Checkbox) */}
                  {hasOptions && (
                    <div className="pl-7 pr-2 py-3 bg-white/3 rounded-xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider">Configure Options</span>
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => {
                            const currentOpts = f.options ?? []
                            updateField(i, 'options', [...currentOpts, `Option ${currentOpts.length + 1}`])
                          }}
                        >
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {(f.options ?? ['Option 1']).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-white/30 font-black w-4 text-center">{optIdx + 1}</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={e => {
                                const newOpts = [...(f.options ?? [])]
                                newOpts[optIdx] = e.target.value
                                updateField(i, 'options', newOpts)
                              }}
                              className="input-field text-xs py-1.5 px-3 flex-1 bg-white/5 border border-white/10 rounded-lg text-white"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            <button
                              onClick={() => {
                                const newOpts = (f.options ?? []).filter((_, j) => j !== optIdx)
                                updateField(i, 'options', newOpts.length ? newOpts : ['Option 1'])
                              }}
                              className="p-1.5 hover:bg-white/10 text-theme-secondary hover:text-danger-400 rounded-lg transition-colors"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Other / Write-in customization for dropdowns */}
                      {f.field_type === 'dropdown' && (
                        <div className="pt-3 border-t border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-primary">Allow write-in ("Other")</span>
                              <span className="text-[10px] text-theme-secondary">Adds a customizable option for custom text input</span>
                            </div>
                            <Toggle 
                              checked={f.allow_custom ?? false} 
                              onChange={v => {
                                updateField(i, 'allow_custom', v)
                                if (v && !f.custom_label) {
                                  updateField(i, 'custom_label', 'Other (Please specify)')
                                }
                              }} 
                            />
                          </div>
                          {f.allow_custom && (
                            <div className="flex items-center gap-3 pl-1">
                              <span className="text-xs text-theme-secondary whitespace-nowrap">"Other" Option Label:</span>
                              <input
                                type="text"
                                value={f.custom_label ?? 'Other (Please specify)'}
                                onChange={e => updateField(i, 'custom_label', e.target.value)}
                                className="input-field text-xs py-1 px-2.5 max-w-xs bg-white/5 border border-white/10 rounded-lg text-white"
                                placeholder="e.g. My school is not listed"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
