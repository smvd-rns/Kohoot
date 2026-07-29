import { create } from 'zustand'
import { applyTheme } from '@/lib/utils'
import type { QuizTheme } from '@/types'

interface ThemeState {
  theme: QuizTheme
  isDark: boolean
  setTheme: (theme: QuizTheme) => void
  toggleDark: () => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: 'modern',
  isDark: true,

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  toggleDark: () =>
    set((s) => {
      const isDark = !s.isDark
      document.documentElement.classList.toggle('dark', isDark)
      return { isDark }
    }),
}))
