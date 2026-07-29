import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, Input, Button, Avatar, Badge, Progress } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { xpForLevel } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { AVATAR_STYLES } from '@/lib/utils'

// Avatar styles available
const avatarStyles = ['adventurer', 'avataaars', 'bottts', 'croodles', 'fun-emoji', 'icons', 'lorelei', 'micah', 'miniavs', 'notionists', 'open-peeps', 'personas', 'pixel-art']

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarStyle, setAvatarStyle] = useState(profile?.avatar_style ?? 'adventurer')
  const [saving, setSaving] = useState(false)

  const xpNeeded = xpForLevel(profile?.level ?? 1)
  const xpProgress = (profile?.xp ?? 0) % xpNeeded

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const updated = await authService.updateProfile(profile.id, { display_name: displayName, bio, avatar_style: avatarStyle })
      setProfile(updated)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">My Profile</h1>

      {/* Profile card */}
      <Card>
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div whileHover={{ scale: 1.05 }} className="mb-4">
            <Avatar seed={profile?.avatar_seed ?? 'default'} style={avatarStyle} size="xl" border />
          </motion.div>
          <h2 className="text-xl font-black text-theme-primary">{profile?.display_name}</h2>
          <p className="text-sm text-theme-secondary">@{profile?.username}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="purple">Level {profile?.level}</Badge>
            <Badge variant="success">{profile?.xp.toLocaleString()} XP</Badge>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-6">
          <Progress value={xpProgress} max={xpNeeded} label={`Progress to Level ${(profile?.level ?? 1) + 1}`} animated />
        </div>

        {/* Avatar style picker */}
        <div className="mb-6">
          <p className="text-sm font-medium text-theme-secondary mb-3">Avatar Style</p>
          <div className="flex flex-wrap gap-2">
            {['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'icons', 'lorelei', 'pixel-art'].map(style => (
              <button
                key={style}
                onClick={() => setAvatarStyle(style)}
                className={`p-1 rounded-xl border-2 transition-all ${avatarStyle === style ? 'border-brand-500' : 'border-transparent'}`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/${style}/svg?seed=${profile?.avatar_seed}&backgroundColor=b6e3f4`}
                  alt={style}
                  className="w-10 h-10 rounded-lg"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-theme-secondary mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="input-field min-h-[80px]"
              maxLength={200}
            />
          </div>
          <Button isLoading={saving} onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}
