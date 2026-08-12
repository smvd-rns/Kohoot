import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
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
  const [pendingApproval, setPendingApproval] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)

  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (profile) {
      const redirectUrl = searchParams.get('redirect')
      const from = redirectUrl || (location.state as { from?: { pathname: string } })?.from?.pathname
      const homeMap: Record<UserRole, string> = { super_admin: '/superadmin', admin: '/admin', student: '/student' }
      navigate(from ?? homeMap[profile.role], { replace: true })
    }
  }, [profile, navigate, location, searchParams])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    }
  })

  const onSubmit = async (data: FormData) => {
    try {
      const profile = await authService.signIn(data.email, data.password)
      setProfile(profile)
      toast.success('Welcome back! 👋')
    } catch (err: any) {
      if (err.message?.includes('pending superadmin approval')) {
        setPendingApproval(true)
      } else {
        const msg = err.message || 'Login failed'
        toast.error(msg)
      }
    }
  }

  if (pendingApproval) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 items-center justify-center mb-4 shadow-glow">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-theme-primary">Approval Pending</h1>
          <p className="text-theme-secondary mt-1">Your teacher/admin account is under review</p>
        </div>

        <Card>
          <div className="space-y-4 text-center py-4">
            <p className="text-sm text-theme-secondary leading-relaxed">
              Thank you for registering with QuizVerse! To prevent misuse, all teacher/admin accounts must be approved by the superadmin before logging in.
            </p>
            <p className="text-xs text-brand-400 font-semibold bg-brand-500/10 py-2 rounded-xl">
              Approval typically takes less than 24 hours.
            </p>
            <Button className="w-full mt-4" onClick={() => setPendingApproval(false)}>
              Back to Sign In
            </Button>
          </div>
        </Card>
      </motion.div>
    )
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
          <Link to={`/register${location.search}`} className="text-brand-400 font-semibold hover:underline">
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
