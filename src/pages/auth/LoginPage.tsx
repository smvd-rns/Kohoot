import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)

  useEffect(() => {
    if (profile) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname
      const homeMap: Record<UserRole, string> = { super_admin: '/superadmin', admin: '/admin', student: '/student' }
      navigate(from ?? homeMap[profile.role], { replace: true })
    }
  }, [profile, navigate, location])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const profile = await authService.signIn(data.email, data.password)
      setProfile(profile)
      toast.success('Welcome back! 👋')
    } catch (err: any) {
      const msg = err.message || 'Login failed'
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
        <h1 className="text-3xl font-black text-theme-primary">Welcome back</h1>
        <p className="text-theme-secondary mt-1">Sign in to QuizVerse</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@school.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />
          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPw(!showPw)} className="cursor-pointer">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-theme-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 font-semibold hover:underline">
            Create one
          </Link>
        </div>
      </Card>

      <p className="text-center text-xs text-theme-secondary mt-6">
        <Link to="/" className="hover:text-theme-primary">← Back to home</Link>
      </p>
    </motion.div>
  )
}
