import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-theme-primary">
      <Sidebar />
      {/* Content area — offset by sidebar width on desktop */}
      <main className="lg:ml-60 pt-16 lg:pt-0 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function StudentLayout() {
  return (
    <div className="min-h-screen bg-theme-primary">
      <Sidebar />
      <main className="lg:ml-60 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen stars-bg flex items-center justify-center p-4" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-glow" style={{ background: 'var(--color-accent-1)' }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-glow" style={{ background: 'var(--color-accent-2)', animationDelay: '1s' }} />
      </div>
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
