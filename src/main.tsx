import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import '@/index.css'
import { Toaster } from 'react-hot-toast'

// Initialize auth and theme on mount
function AppInit({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(s => s.initialize)
  const setTheme = useThemeStore(s => s.setTheme)

  React.useEffect(() => {
    initialize()
    setTheme('modern')
    document.documentElement.classList.add('dark')
  }, [initialize, setTheme])

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          },
        }}
      />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppInit>
      <RouterProvider router={router} />
    </AppInit>
  </React.StrictMode>
)
