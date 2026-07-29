import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Hash, ArrowRight, User } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
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

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: searchParams.get('code') ?? '',
      nickname: '',
    }
  })

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
      const fields = await quizService.getCustomFields(session.quiz_id)
      setCustomFields(fields)
      
      if (profile && fields.length === 0) {
        await executeJoin(session.id, profile, {})
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

  const executeJoin = async (sId: string, currentProfile: any, data: any) => {
    const p = await quizService.joinSession(sId, currentProfile.id, currentProfile.display_name, currentProfile.avatar_seed)
    
    if (customFields.length > 0) {
      const responses = customFields.map(f => ({
        field_id: f.id,
        value: data[f.id] ?? ''
      }))
      await quizService.saveCustomFieldResponses(p.id, responses)
    }
    navigate(`/quiz/lobby/${sId}`)
  }

  const onSubmit = async (data: FormData) => {
    if (step === 1) {
      await onNextStep()
      return
    }

    setLoading(true)
    try {
      let currentProfile = profile

      for (const field of customFields) {
        if (field.is_required && !data[field.id]) {
          toast.error(`Please fill out ${field.label}`)
          setLoading(false)
          return
        }
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

      await executeJoin(sessionId!, currentProfile, data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to join')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-3xl font-black text-theme-primary">Join a Quiz</h1>
        <p className="text-theme-secondary mt-2">Enter the room code from your teacher</p>
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
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {!profile && (
                  <Input
                    label="Your Nickname"
                    placeholder="Enter your name"
                    leftIcon={<User className="w-4 h-4" />}
                    error={errors.nickname?.message as string}
                    {...register('nickname')}
                  />
                )}
                {customFields.map(field => (
                  <Input
                    key={field.id}
                    label={field.label + (field.is_required ? ' *' : '')}
                    placeholder={field.placeholder ?? ''}
                    error={errors[field.id]?.message as string}
                    {...register(field.id)}
                  />
                ))}
              </motion.div>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={loading} rightIcon={<ArrowRight className="w-5 h-5" />}>
              {step === 1 ? 'Continue' : 'Join Quiz'}
            </Button>
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
