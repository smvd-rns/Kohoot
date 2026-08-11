import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, GraduationCap, Shield, Phone } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

const schema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().min(1, 'Last name is required'),
  phone:        z.string().optional(),
  email:        z.string().email('Enter a valid email'),
  password:     z.string().min(6, 'Password must be at least 6 characters'),
  confirmPw:    z.string(),
  role:         z.enum(['admin', 'student']),
}).refine(d => d.password === d.confirmPw, { message: "Passwords don't match", path: ['confirmPw'] })

type FormData = z.infer<typeof schema>

const roles = [
  { value: 'admin'  as const, label: 'Teacher / Admin',  icon: Shield,        desc: 'Create and manage quizzes' },
  { value: 'student'as const, label: 'Student',           icon: GraduationCap, desc: 'Join quizzes and learn' },
]

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const profile = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)

  const isStudentOnly = searchParams.get('role') === 'student'

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  })

  const selectedRole = watch('role')

  useEffect(() => {
    if (profile) {
      const redirectUrl = searchParams.get('redirect')
      navigate(redirectUrl || (profile.role === 'admin' ? '/admin' : '/student'), { replace: true })
    }
  }, [profile, navigate, searchParams])

  const onSubmit = async (data: FormData) => {
    try {
      // Auto-generate display_name and DB-safe username
      const display_name = `${data.firstName.trim()} ${data.lastName.trim()}`
      
      // Keep only alphanumeric and underscores, lowercase it, append short random string to avoid duplicate usernames
      const cleanFirst = data.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanLast = data.lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const randomSuffix = Math.floor(100 + Math.random() * 900) // 3 digit random number
      const username = `${cleanFirst}_${cleanLast}_${randomSuffix}`

      const signUpData = {
        email: data.email,
        password: data.password,
        confirmPw: data.confirmPw,
        role: data.role,
        display_name,
        username,
        phone: data.phone,
      }

      const profile = await authService.signUp(signUpData as any)
      if (profile.role === 'admin' && !profile.is_approved) {
        await authService.signOut()
        toast.success('Registration request sent! Awaiting Superadmin approval before you can log in.', { duration: 6000 })
        navigate('/login')
        return
      }
      setProfile(profile)
      toast.success('Account created successfully! Welcome 🎉')
    } catch (err: any) {
      const msg = err.message || 'Registration failed'
      toast.error(msg)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-brand items-center justify-center mb-4 shadow-glow">
          <span className="text-white font-black text-3xl">Q</span>
        </div>
        <h1 className="text-3xl font-black text-theme-primary">Join QuizVerse</h1>
        <p className="text-theme-secondary mt-1">Create your free account</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Role selector */}
          {!isStudentOnly && (
            <div>
              <p className="text-sm font-medium text-theme-secondary mb-3">I am a...</p>
              <div className="grid grid-cols-2 gap-3">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setValue('role', r.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center',
                      selectedRole === r.value
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-theme bg-transparent text-theme-secondary hover:bg-white/5'
                    )}
                  >
                    <r.icon className="w-6 h-6" />
                    <div>
                      <p className="text-sm font-semibold">{r.label}</p>
                      <p className="text-xs opacity-70">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="First name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Last name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Mobile Number"
            type="tel"
            placeholder="Your phone number"
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@school.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPw?.message}
              {...register('confirmPw')}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-theme-secondary">
          Already have an account?{' '}
          <Link to={`/login${location.search}`} className="text-brand-400 font-semibold hover:underline">Sign in</Link>
        </div>
      </Card>

      <p className="text-center text-xs text-theme-secondary mt-6">
        <Link to="/" className="hover:text-theme-primary">← Back to home</Link>
      </p>
    </motion.div>
  )
}
