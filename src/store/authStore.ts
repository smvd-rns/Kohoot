import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, UserRole } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (v: boolean) => void
  initialize: () => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      isInitialized: false,

      setProfile: (profile) => set({ profile }),
      setLoading: (v) => set({ isLoading: v }),

      initialize: async () => {
        set({ isLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()
            if (profile) set({ profile })
          } else {
            set({ profile: null })
          }
        } catch (err) {
          console.error('Auth init error:', err)
        } finally {
          set({ isLoading: false, isInitialized: true })
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ profile: null })
      },

      hasRole: (role) => {
        const { profile } = get()
        if (!profile) return false
        if (Array.isArray(role)) return role.includes(profile.role)
        return profile.role === role
      },
    }),
    {
      name: 'quizverse-auth',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
