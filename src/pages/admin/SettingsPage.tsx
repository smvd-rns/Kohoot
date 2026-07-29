import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, Input, Button, Avatar } from '@/components/ui'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import { THEMES } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

export default function AdminSettingsPage() {
  const { profile, setProfile } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const updated = await authService.updateProfile(profile.id, { display_name: displayName })
      setProfile(updated)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-theme-primary">Settings</h1>
        <p className="text-theme-secondary text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <h2 className="text-lg font-bold text-theme-primary mb-6">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <Avatar seed={profile?.avatar_seed ?? 'default'} size="xl" border />
          <div>
            <p className="font-bold text-theme-primary">{profile?.display_name}</p>
            <p className="text-sm text-theme-secondary">@{profile?.username}</p>
            <p className="text-sm text-theme-secondary">{profile?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <Button isLoading={saving} onClick={handleSaveProfile}>Save Profile</Button>
        </div>
      </Card>

      {/* Default theme */}
      <Card>
        <h2 className="text-lg font-bold text-theme-primary mb-4">Default Quiz Theme</h2>
        <div className="flex flex-wrap gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn('flex flex-col items-center gap-1 p-2 rounded-xl transition-all', theme === t.id ? 'ring-2 ring-brand-500' : '')}
            >
              <div className="w-10 h-10 rounded-xl" style={{ background: t.gradient }} />
              <span className="text-xs text-theme-secondary">{t.name}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
