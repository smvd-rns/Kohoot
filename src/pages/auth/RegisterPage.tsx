import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, GraduationCap, Shield } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
  username:     z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
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
  const setProfile = useAuthStore(s => s.setProfile)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: FormData) => {
    try {
      const profile = await authService.signUp({
        email: data.email,
        password: data.password,
        username: data.username,
        display_name: data.display_name,
        role: data.role,
      })
      setProfile(profile)
      toast.success('Account created! Welcome to QuizVerse 🎉')
      navigate(data.role === 'admin' ? '/admin' : '/student')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg.includes('already') ? 'Email already registered' : msg)
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Your name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.display_name?.message}
              {...register('display_name')}
            />
            <Input
              label="Username"
              placeholder="yourusername"
              error={errors.username?.message}
              {...register('username')}
            />
          </div>

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
          <Link to="/login" className="text-brand-400 font-semibold hover:underline">Sign in</Link>
        </div>
      </Card>

      <p className="text-center text-xs text-theme-secondary mt-6">
        <Link to="/" className="hover:text-theme-primary">← Back to home</Link>
      </p>
    </motion.div>
  )
}
