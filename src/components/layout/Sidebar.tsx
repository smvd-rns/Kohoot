import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BookOpen, Users, BarChart2, Settings,
  Play, Palette, LogOut, Menu, X, ChevronRight,
  Shield, Globe, Zap,
} from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  to: string
  badge?: string
}

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/admin' },
  { icon: BookOpen,        label: 'Quizzes',    to: '/admin/quizzes' },
  { icon: Play,            label: 'Sessions',   to: '/admin/sessions' },
  { icon: Users,           label: 'Students',   to: '/admin/students' },
  { icon: BarChart2,       label: 'Analytics',  to: '/admin/analytics' },
  { icon: Palette,         label: 'Themes',     to: '/admin/themes' },
  { icon: Settings,        label: 'Settings',   to: '/admin/settings' },
]

const superAdminNav: NavItem[] = [
  { icon: Shield,          label: 'SA Dashboard', to: '/superadmin' },
  { icon: Users,           label: 'Manage Admins',to: '/superadmin/admins' },
  { icon: Globe,           label: 'Platform',     to: '/superadmin/analytics' },
  { icon: Settings,        label: 'Settings',     to: '/superadmin/settings' },
]

const studentNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/student' },
  { icon: Zap,             label: 'Join Quiz',    to: '/student/join' },
  { icon: BookOpen,        label: 'My History',   to: '/student/history' },
  { icon: BarChart2,       label: 'Achievements', to: '/student/achievements' },
  { icon: Users,           label: 'Profile',      to: '/student/profile' },
]

export function Sidebar() {
  const { profile, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const navItems =
    profile?.role === 'super_admin' ? superAdminNav :
    profile?.role === 'admin' ? adminNav :
    studentNav

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-theme">
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-lg">Q</span>
        </div>
        {!collapsed && (
          <span className="text-xl font-black gradient-text">QuizVerse</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-theme-secondary hidden lg:flex"
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to.split('/').length <= 2}>
            {({ isActive }) => (
              <div className={cn('sidebar-item', isActive && 'active')}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-theme">
        <div className={cn('flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer', collapsed && 'justify-center')}>
          <Avatar seed={profile?.avatar_seed ?? 'default'} size="sm" border />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-theme-primary truncate">{profile?.display_name}</p>
              <p className="text-xs text-theme-secondary capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn('mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-danger-400 hover:bg-danger-500/10 transition-colors', collapsed && 'justify-center')}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 glass border-r border-theme"
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 glass border-b border-theme">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <span className="text-white font-black">Q</span>
          </div>
          <span className="text-lg font-black gradient-text">QuizVerse</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/10">
          <Menu className="w-5 h-5 text-theme-primary" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 z-50 w-72 glass-strong flex flex-col lg:hidden"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-theme">
                <span className="text-xl font-black gradient-text">QuizVerse</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5 text-theme-primary" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
