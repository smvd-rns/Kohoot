import { motion } from 'framer-motion'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/lib/utils'
import { Card } from '@/components/ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ThemesPage() {
  const { theme: currentTheme, setTheme } = useThemeStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-theme-primary">Themes</h1>
        <p className="text-theme-secondary text-sm">Choose a visual theme for your quiz experience</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {THEMES.map((theme, i) => (
          <motion.div
            key={theme.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <button
              onClick={() => setTheme(theme.id)}
              className={cn('w-full text-left glass rounded-2xl overflow-hidden transition-all hover:scale-105', currentTheme === theme.id ? 'ring-2 ring-brand-500 shadow-glow' : '')}
            >
              {/* Preview gradient */}
              <div className="h-24 relative" style={{ background: theme.gradient }}>
                <div className="absolute inset-0 flex items-center justify-center text-5xl">
                  {theme.emoji}
                </div>
                {currentTheme === theme.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-brand-600" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold text-theme-primary">{theme.name}</p>
                <p className="text-xs text-theme-secondary mt-0.5">{theme.description}</p>
                {currentTheme === theme.id && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-400">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Preview section */}
      <Card>
        <h2 className="text-lg font-bold text-theme-primary mb-4">Preview — Current Theme: {THEMES.find(t => t.id === currentTheme)?.name}</h2>
        <div className="grid grid-cols-4 gap-3">
          {['A', 'B', 'C', 'D'].map((opt, i) => (
            <div key={opt} className={`quiz-answer-${opt.toLowerCase()} p-4 rounded-xl text-white font-bold text-center text-lg`}>
              {opt}
            </div>
          ))}
        </div>
        <div className="mt-4 h-3 rounded-full overflow-hidden glass">
          <motion.div
            className="h-3 rounded-full"
            style={{ background: THEMES.find(t => t.id === currentTheme)?.gradient }}
            initial={{ width: '100%' }}
            animate={{ width: '45%' }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          />
        </div>
        <p className="text-center text-theme-secondary text-sm mt-3">⏱ Timer bar preview</p>
      </Card>
    </div>
  )
}
