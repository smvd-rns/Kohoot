import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Hash, ArrowRight, User, Clock, AlertTriangle } from 'lucide-react'
import { Button, Input, Card, Badge } from '@/components/ui'
import { quizService } from '@/services/quiz.service'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import type { CustomField } from '@/types'

const schema = z.object({
  code: z.string().min(4).max(8).toUpperCase(),
  nickname: z.string().optional(),
}).catchall(z.any())

type FormData = z.infer<typeof schema>

export default function JoinQuizPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile, setProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionMode, setSessionMode] = useState<'live' | 'self_paced'>('live')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [quizTitle, setQuizTitle] = useState('')
  const [participantMode, setParticipantMode] = useState<'any' | 'registered_only'>('any')
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [allowRetakes, setAllowRetakes] = useState(true)

  const { register, handleSubmit, getValues, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: searchParams.get('code') ?? '',
      nickname: '',
    }
  })

  // Auto pre-fill registration fields from logged-in profile
  useEffect(() => {
    if (!profile || customFields.length === 0) return
    customFields.forEach(field => {
      const labelLower = field.label.trim().toLowerCase()
      
      // Strict name matching: only match "name" / "student name" / "full name" / "your name"
      // Do NOT match "college name", "clg name", "school name", "class name", etc.
      const isStrictName = ['name', 'full name', 'student name', 'your name'].includes(labelLower)
      
      if (labelLower.includes('email')) {
        if (profile.email && !profile.email.startsWith('guest_')) {
          setValue(field.id, profile.email)
        }
      } else if (isStrictName) {
        if (profile.display_name && !profile.display_name.startsWith('guest_')) {
          setValue(field.id, profile.display_name)
        }
      } else if (labelLower.includes('phone') || labelLower.includes('mobile') || labelLower.includes('tel') || labelLower.includes('contact')) {
        if (profile.phone) {
          setValue(field.id, profile.phone)
        }
      }
    })
  }, [profile, customFields, setValue])

  const onNextStep = async () => {
    const code = getValues('code')
    if (!code || code.length < 4) {
      toast.error('Enter a valid room code')
      return
    }
    setLoading(true)
    try {
      const session = await quizService.getSessionByCode(code)
      if (!session) throw new Error('Session not found')
      setSessionId(session.id)
      setSessionMode((session as any).mode ?? 'live')
      setQuizTitle((session as any).quiz?.title ?? 'Quiz')

      // Check deadline for self-paced
      if ((session as any).mode === 'self_paced' && (session as any).deadline) {
        const dl = (session as any).deadline as string
        setDeadline(dl)
        if (new Date(dl).getTime() < Date.now()) {
          setDeadlinePassed(true)
          setStep(2)
          setLoading(false)
          return
        }
      }

      setParticipantMode((session as any).participant_mode ?? 'any')

      const fields = await quizService.getCustomFields(session.quiz_id)
      setCustomFields(fields)

      // Retake validation logic
      let hasCompleted = false
      const canRetake = (session as any).quiz?.allow_retakes ?? true
      setAllowRetakes(canRetake)

      if (profile) {
        const part = await quizService.getStudentParticipant(session.id, profile.id)
        
        if (part && part.is_finished) {
          hasCompleted = true
        }

        if (hasCompleted) {
          if (!canRetake) {
            setAlreadyCompleted(true)
            setStep(2)
            setLoading(false)
            return
          } else if (part && part.is_finished) {
            // Reset their progress so they can retry clean in this session
            await quizService.resetParticipantProgress(part.id)
          }
        }
      }

      if (profile && fields.length === 0) {
        await executeJoin(session.id, profile, {}, (session as any).mode ?? 'live')
      } else {
        setStep(2)
      }
    } catch (err: any) {
      toast.error('Invalid room code or session is not active')
    } finally { setLoading(false) }
  }

  // Auto-submit if code is provided via QR scan (URL param)
  useEffect(() => {
    if (searchParams.get('code')) {
      onNextStep()
    }
  }, [searchParams])

  const executeJoin = async (sId: string, currentProfile: any, data: any, mode: string) => {
    const p = await quizService.joinSession(sId, currentProfile.id, currentProfile.display_name, currentProfile.avatar_seed)

    if (customFields.length > 0) {
      const responses = customFields.map(f => {
        const isCustomSelected = f.field_type === 'dropdown' && f.allow_custom && data[f.id] === (f.custom_label || 'Other')
        return {
          field_id: f.id,
          value: (isCustomSelected ? data[`${f.id}_custom`] : data[f.id]) ?? ''
        }
      })
      await quizService.saveCustomFieldResponses(p.id, responses)
    }

    if (mode === 'self_paced') {
      navigate(`/quiz/self-paced/${sId}`)
    } else {
      navigate(`/quiz/lobby/${sId}`)
    }
  }

  const onSubmit = async (data: FormData) => {
    // Unlock browser audio context
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA')
      audio.play().catch(() => {})
    } catch {}

    if (step === 1) {
      await onNextStep()
      return
    }

    if (deadlinePassed) return

    setLoading(true)
    try {
      let currentProfile = profile

      for (const field of customFields) {
        const isCustomSelected = field.field_type === 'dropdown' && field.allow_custom && data[field.id] === (field.custom_label || 'Other')
        const val = isCustomSelected ? data[`${field.id}_custom`] : data[field.id]

        if (field.is_required && (!val || val.toString().trim() === '')) {
          toast.error(`Please fill out ${field.label}`)
          setLoading(false)
          return
        }
      }

      const isRegisteredOnly = participantMode === 'registered_only'
      const isGuest = currentProfile?.email?.startsWith('guest_')
      const isAnonymous = !currentProfile || isGuest

      if (isRegisteredOnly && isAnonymous) {
        toast.error('This quiz session is restricted to registered members only. Please log in.')
        setLoading(false)
        return
      }

      if (!currentProfile) {
        if (!data.nickname || data.nickname.trim().length < 2) {
          toast.error('Please enter a display name (at least 2 characters)')
          setLoading(false)
          return
        }
        toast.loading('Joining as guest...', { id: 'auth-guest' })
        try {
          const guestProfile = await authService.signInAnonymously(data.nickname.trim())
          setProfile(guestProfile)
          currentProfile = guestProfile
          toast.success(`Signed in as guest: ${guestProfile.display_name}`, { id: 'auth-guest' })
        } catch {
          toast.error('Failed to log in as guest.', { id: 'auth-guest' })
          setLoading(false)
          return
        }
      }

      await executeJoin(sessionId!, currentProfile, data, sessionMode)
    } catch (err: any) {
      toast.error(err.message || 'Failed to join')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="text-6xl mb-4">{sessionMode === 'self_paced' && step === 2 ? '📋' : '🎮'}</div>
        <h1 className="text-3xl font-black text-theme-primary">
          {step === 1 ? 'Join a Quiz' : sessionMode === 'self_paced' ? 'Self-Paced Quiz' : 'Join Quiz'}
        </h1>
        <p className="text-theme-secondary mt-2">
          {step === 1 ? 'Enter the room code from your teacher' : quizTitle || 'Get ready to answer!'}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-md">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {step === 1 ? (
              <Input
                label="Room Code"
                placeholder="ABC123"
                leftIcon={<Hash className="w-4 h-4" />}
                error={errors.code?.message as string}
                className="text-2xl text-center font-black tracking-widest uppercase"
                {...register('code')}
              />
            ) : alreadyCompleted ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-4">
                <div className="text-5xl">🏆</div>
                <p className="font-bold text-brand-400 text-lg">Quiz Already Submitted</p>
                <p className="text-sm text-theme-secondary">
                  You have already completed "<strong className="text-theme-primary">{quizTitle}</strong>". 
                  Retakes are not allowed for this quiz.
                </p>
                <Button type="button" className="w-full mt-2" onClick={() => navigate(`/quiz/results/${sessionId}`)}>
                  View My Results
                </Button>
              </motion.div>
            ) : deadlinePassed ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-3">
                <div className="text-5xl">⏰</div>
                <p className="font-bold text-danger-400">Quiz Deadline Passed</p>
                <p className="text-sm text-theme-secondary">
                  The deadline for "<strong className="text-theme-primary">{quizTitle}</strong>" has passed. You can no longer submit answers.
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Self-paced info card */}
                {sessionMode === 'self_paced' && (
                  <div className="glass rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">📋 Self-Paced</Badge>
                      <span className="text-sm font-medium text-theme-primary">{quizTitle}</span>
                    </div>
                    {deadline && (
                      <div className={`flex items-center gap-1.5 text-sm ${new Date(deadline).getTime() - Date.now() < 3600000 ? 'text-danger-400' : 'text-theme-secondary'}`}>
                        {new Date(deadline).getTime() - Date.now() < 3600000
                          ? <AlertTriangle className="w-4 h-4" />
                          : <Clock className="w-4 h-4" />}
                        <span>Deadline: <strong>{new Date(deadline).toLocaleString()}</strong></span>
                      </div>
                    )}
                    <p className="text-xs text-theme-secondary">Take this quiz at your own pace. Each question has its own timer.</p>
                  </div>
                )}

                {/* Login required block for registered-only sessions */}
                {participantMode === 'registered_only' && (!profile || profile.email.startsWith('guest_')) ? (
                  <div className="glass border border-red-500/30 rounded-2xl p-5 text-center space-y-4">
                    <div className="text-3xl">🔒</div>
                    <p className="font-bold text-theme-primary">Registered Students Only</p>
                    <p className="text-xs text-theme-secondary">
                      The teacher has configured this session to only allow registered students so all your scores can be tracked. Guests are not allowed.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" type="button" onClick={() => navigate(`/login?role=student&redirect=${encodeURIComponent(`/student/join?code=${getValues('code')}`)}`)}>
                        Sign In
                      </Button>
                      <Button className="flex-1" type="button" onClick={() => navigate(`/register?role=student&redirect=${encodeURIComponent(`/student/join?code=${getValues('code')}`)}`)}>
                        Create Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!profile && (
                      <Input
                        label="Your Nickname"
                        placeholder="Enter your name"
                        leftIcon={<User className="w-4 h-4" />}
                        error={errors.nickname?.message as string}
                        {...register('nickname')}
                      />
                    )}
                    {customFields.map(field => {
                      const labelText = field.label + (field.is_required ? ' *' : '')
                      const fieldOpts = field.options ?? []

                      if (field.field_type === 'dropdown') {
                        const selectedValue = watch(field.id)
                        const showWriteIn = field.allow_custom && selectedValue === (field.custom_label || 'Other')
                        return (
                          <div key={field.id} className="space-y-3.5 text-left">
                            <div className="space-y-1">
                              <label className="text-sm font-semibold text-theme-primary">{labelText}</label>
                              <select
                                {...register(field.id)}
                                className="input-field w-full bg-[var(--color-bg-secondary)] border border-theme text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                              >
                                <option value="">Select an option...</option>
                                {fieldOpts.map(o => (
                                  <option key={o} value={o} className="bg-slate-900 text-white">{o}</option>
                                ))}
                                {field.allow_custom && (
                                  <option value={field.custom_label || 'Other'} className="bg-slate-900 text-white font-bold text-brand-400">
                                    {field.custom_label || 'Other'}
                                  </option>
                                )}
                              </select>
                              {errors[field.id] && !showWriteIn && (
                                <p className="text-xs text-danger-400 mt-1">{errors[field.id]?.message as string}</p>
                              )}
                            </div>

                            {/* Dynamically show text input when Custom Label is chosen */}
                            {showWriteIn && (
                              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                                <label className="text-xs font-semibold text-theme-secondary">Please specify:</label>
                                <input
                                  type="text"
                                  placeholder="Type your answer..."
                                  {...register(`${field.id}_custom`, {
                                    required: field.is_required ? "Please specify your custom option" : false
                                  })}
                                  className="input-field w-full bg-[var(--color-bg-secondary)] border border-theme text-white rounded-xl py-2 px-3.5 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                                />
                                {errors[`${field.id}_custom`] && (
                                  <p className="text-xs text-danger-400 mt-1">{errors[`${field.id}_custom`]?.message as string}</p>
                                )}
                              </motion.div>
                            )}
                          </div>
                        )
                      }

                      if (field.field_type === 'radio') {
                        return (
                          <div key={field.id} className="space-y-2 text-left">
                            <label className="text-sm font-semibold text-theme-primary">{labelText}</label>
                            <div className="space-y-2">
                              {fieldOpts.map(o => (
                                <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm text-theme-secondary hover:text-white">
                                  <input
                                    type="radio"
                                    value={o}
                                    {...register(field.id)}
                                    className="w-4 h-4 accent-brand-500 rounded-full cursor-pointer"
                                  />
                                  <span>{o}</span>
                                </label>
                              ))}
                            </div>
                            {errors[field.id] && (
                              <p className="text-xs text-danger-400 mt-1">{errors[field.id]?.message as string}</p>
                            )}
                          </div>
                        )
                      }

                      if (field.field_type === 'checkbox') {
                        return (
                          <div key={field.id} className="space-y-2 text-left">
                            <label className="text-sm font-semibold text-theme-primary">{labelText}</label>
                            <div className="space-y-2">
                              {fieldOpts.map(o => (
                                <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm text-theme-secondary hover:text-white">
                                  <input
                                    type="checkbox"
                                    value={o}
                                    {...register(field.id)}
                                    className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                                  />
                                  <span>{o}</span>
                                </label>
                              ))}
                            </div>
                            {errors[field.id] && (
                              <p className="text-xs text-danger-400 mt-1">{errors[field.id]?.message as string}</p>
                            )}
                          </div>
                        )
                      }

                      return (
                        <Input
                          key={field.id}
                          label={labelText}
                          placeholder={field.placeholder ?? ''}
                          error={errors[field.id]?.message as string}
                          {...register(field.id)}
                        />
                      )
                    })}
                  </>
                )}
              </motion.div>
            )}

            {/* Disable submit button if login is required, deadline is passed, or already completed */}
            {!deadlinePassed && !alreadyCompleted && !(participantMode === 'registered_only' && (!profile || profile.email.startsWith('guest_'))) && (
              <Button type="submit" className="w-full" size="lg" isLoading={loading} rightIcon={<ArrowRight className="w-5 h-5" />}>
                {step === 1 ? 'Continue' : sessionMode === 'self_paced' ? 'Start Quiz' : 'Join Quiz'}
              </Button>
            )}

            {(deadlinePassed || alreadyCompleted) && (
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/student')}>
                Back to Dashboard
              </Button>
            )}
          </form>
          {step === 1 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-theme-secondary">Or scan the QR code from your teacher's screen</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
