import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import { AdminLayout, StudentLayout, AuthLayout } from '@/components/layout'
import type { UserRole } from '@/types'

// ── Lazy pages ──────────────────────────────────────────────────────────────
const LandingPage         = lazy(() => import('@/pages/public/LandingPage'))
const LoginPage           = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage        = lazy(() => import('@/pages/auth/RegisterPage'))

// Admin
const AdminDashboard      = lazy(() => import('@/pages/admin/DashboardPage'))
const QuizzesPage         = lazy(() => import('@/pages/admin/QuizzesPage'))
const QuizBuilderPage     = lazy(() => import('@/pages/admin/QuizBuilderPage'))
const QuizSettingsPage    = lazy(() => import('@/pages/admin/QuizSettingsPage'))
const StudentsPage        = lazy(() => import('@/pages/admin/StudentsPage'))
const SessionsPage        = lazy(() => import('@/pages/admin/SessionsPage'))
const ReportsPage         = lazy(() => import('@/pages/admin/ReportsPage'))
const AnalyticsPage       = lazy(() => import('@/pages/admin/AnalyticsPage'))
const ThemesPage          = lazy(() => import('@/pages/admin/ThemesPage'))
const AdminSettingsPage   = lazy(() => import('@/pages/admin/SettingsPage'))
const HostSessionPage       = lazy(() => import('@/pages/admin/HostSessionPage'))
const SelfPacedManagePage   = lazy(() => import('@/pages/admin/SelfPacedManagePage'))

// Super Admin
const SuperDashboard      = lazy(() => import('@/pages/superadmin/SuperDashboard'))
const ManageAdmins        = lazy(() => import('@/pages/superadmin/ManageAdmins'))
const PlatformAnalytics   = lazy(() => import('@/pages/superadmin/PlatformAnalytics'))

// Student
const StudentDashboard    = lazy(() => import('@/pages/student/StudentDashboard'))
const JoinQuizPage        = lazy(() => import('@/pages/student/JoinQuizPage'))
const QuizLobbyPage       = lazy(() => import('@/pages/student/QuizLobbyPage'))
const QuizPlayPage        = lazy(() => import('@/pages/student/QuizPlayPage'))
const ResultsPage         = lazy(() => import('@/pages/student/ResultsPage'))
const AchievementsPage    = lazy(() => import('@/pages/student/AchievementsPage'))
const ProfilePage         = lazy(() => import('@/pages/student/ProfilePage'))
const HistoryPage         = lazy(() => import('@/pages/student/HistoryPage'))
const SelfPacedPlayPage   = lazy(() => import('@/pages/student/SelfPacedPlayPage'))

// ── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center animate-pulse">
          <span className="text-white font-black text-xl">Q</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  )
}

// ── Auth guards ──────────────────────────────────────────────────────────────
function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { profile, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) return <PageLoader />
  if (!profile) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(profile.role)) {
    // Redirect to appropriate dashboard
    const homeMap: Record<UserRole, string> = {
      super_admin: '/superadmin',
      admin: '/admin',
      student: '/student',
    }
    return <Navigate to={homeMap[profile.role]} replace />
  }
  return null
}

function AuthGuardWrapper({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const guard = RequireAuth({ roles })
  if (guard) return guard
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore()
  if (profile) {
    const homeMap: Record<UserRole, string> = { super_admin: '/superadmin', admin: '/admin', student: '/student' }
    return <Navigate to={homeMap[profile.role]} replace />
  }
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // Public
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
  },
  {
    path: '/student/join',
    element: <Suspense fallback={<PageLoader />}><JoinQuizPage /></Suspense>,
  },

  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <PublicOnly><LoginPage /></PublicOnly>,
      },
      {
        path: '/register',
        element: <PublicOnly><RegisterPage /></PublicOnly>,
      },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    element: (
      <AuthGuardWrapper roles={['admin', 'super_admin']}>
        <AdminLayout />
      </AuthGuardWrapper>
    ),
    children: [
      { index: true,             element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
      { path: 'quizzes',         element: <Suspense fallback={<PageLoader />}><QuizzesPage /></Suspense> },
      { path: 'quizzes/:id/edit',element: <Suspense fallback={<PageLoader />}><QuizBuilderPage /></Suspense> },
      { path: 'quizzes/:id/settings', element: <Suspense fallback={<PageLoader />}><QuizSettingsPage /></Suspense> },
      { path: 'sessions',        element: <Suspense fallback={<PageLoader />}><SessionsPage /></Suspense> },
      { path: 'reports',         element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense> },
      { path: 'students',        element: <Suspense fallback={<PageLoader />}><StudentsPage /></Suspense> },
      { path: 'analytics',       element: <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense> },
      { path: 'themes',          element: <Suspense fallback={<PageLoader />}><ThemesPage /></Suspense> },
      { path: 'settings',        element: <Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense> },
    ],
  },

  // Super admin routes
  {
    path: '/superadmin',
    element: (
      <AuthGuardWrapper roles={['super_admin']}>
        <AdminLayout />
      </AuthGuardWrapper>
    ),
    children: [
      { index: true,       element: <Suspense fallback={<PageLoader />}><SuperDashboard /></Suspense> },
      { path: 'admins',    element: <Suspense fallback={<PageLoader />}><ManageAdmins /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={<PageLoader />}><PlatformAnalytics /></Suspense> },
      { path: 'reports',   element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense> },
    ],
  },

  // Student routes
  {
    path: '/student',
    element: (
      <AuthGuardWrapper roles={['student']}>
        <StudentLayout />
      </AuthGuardWrapper>
    ),
    children: [
      { index: true,             element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense> },
      { path: 'achievements',    element: <Suspense fallback={<PageLoader />}><AchievementsPage /></Suspense> },
      { path: 'history',         element: <Suspense fallback={<PageLoader />}><HistoryPage /></Suspense> },
      { path: 'profile',         element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense> },
    ],
  },

  // Full-screen quiz flow (no sidebar)
  {
    path: '/admin/sessions/:sessionId/host',
    element: (
      <AuthGuardWrapper roles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}><HostSessionPage /></Suspense>
      </AuthGuardWrapper>
    ),
  },
  {
    path: '/quiz/lobby/:sessionId',
    element: (
      <AuthGuardWrapper roles={['student']}>
        <Suspense fallback={<PageLoader />}><QuizLobbyPage /></Suspense>
      </AuthGuardWrapper>
    ),
  },
  {
    path: '/quiz/play/:sessionId',
    element: (
      <AuthGuardWrapper roles={['student']}>
        <Suspense fallback={<PageLoader />}><QuizPlayPage /></Suspense>
      </AuthGuardWrapper>
    ),
  },
  {
    path: '/quiz/results/:sessionId',
    element: (
      <AuthGuardWrapper roles={['student']}>
        <Suspense fallback={<PageLoader />}><ResultsPage /></Suspense>
      </AuthGuardWrapper>
    ),
  },

  {
    path: '/admin/sessions/:sessionId/self-paced',
    element: (
      <AuthGuardWrapper roles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}><SelfPacedManagePage /></Suspense>
      </AuthGuardWrapper>
    ),
  },
  {
    path: '/quiz/self-paced/:sessionId',
    element: (
      <AuthGuardWrapper roles={['student']}>
        <Suspense fallback={<PageLoader />}><SelfPacedPlayPage /></Suspense>
      </AuthGuardWrapper>
    ),
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])
