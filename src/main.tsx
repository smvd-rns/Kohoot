import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import '@/index.css'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// Initialize auth and theme on mount
function AppInit({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(s => s.initialize)
  const setProfile = useAuthStore(s => s.setProfile)
  const setTheme = useThemeStore(s => s.setTheme)

  React.useEffect(() => {
    initialize()
    setTheme('modern')
    document.documentElement.classList.add('dark')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch/Sync profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        
        if (profile) {
          setProfile(profile)
        } else {
          // If profile doesn't exist yet, we don't clear it immediately as registration/sign-in flows
          // will create it and trigger their own update.
        }
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialize, setProfile, setTheme])

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
