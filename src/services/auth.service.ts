import { supabase } from '@/lib/supabase'
import type { Profile, AuthFormData } from '@/types'
import { generateAvatarSeed } from '@/lib/utils'

export const authService = {
  async getOrCreateClerkProfile(clerkUser: any): Promise<Profile> {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', clerkUser.id)
      .maybeSingle()

    if (existingProfile) {
      return existingProfile
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    const isSuperAdmin = email === import.meta.env.VITE_SUPER_ADMIN_EMAIL
    const role = isSuperAdmin ? 'super_admin' : (clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'admin')

    const username = clerkUser.username || email.split('@')[0] || `user_${clerkUser.id.substring(0, 8)}`
    const displayName = clerkUser.fullName || username

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: clerkUser.id,
        email,
        username,
        display_name: displayName,
        role,
        avatar_seed: generateAvatarSeed(),
        avatar_style: 'adventurer',
        xp: 0,
        level: 1,
      })
      .select()
      .single()

    if (error) throw error
    return newProfile
  },

  async signUp(data: AuthFormData & { display_name: string; role: 'admin' | 'student'; phone?: string }): Promise<Profile> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          display_name: data.display_name,
          role: data.role,
          phone: data.phone,
        },
      },
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Registration failed')

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        username: data.username || data.email.split('@')[0],
        display_name: data.display_name,
        role: data.role,
        avatar_seed: generateAvatarSeed(),
        avatar_style: 'adventurer',
        xp: 0,
        level: 1,
        is_approved: data.role !== 'admin',
        phone: data.phone || null,
      })
      .select()
      .single()

    if (profileError) throw profileError
    return profile
  },

  async signIn(email: string, password: string): Promise<Profile> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!authData.user) throw new Error('Login failed')

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (!profile) {
      const userMeta = authData.user.user_metadata || {}
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          username: userMeta.username || authData.user.email!.split('@')[0],
          display_name: userMeta.display_name || userMeta.username || authData.user.email!.split('@')[0],
          role: userMeta.role || 'student',
          avatar_seed: generateAvatarSeed(),
          avatar_style: 'adventurer',
          xp: 0,
          level: 1,
        })
        .select()
        .single()

      if (createError) throw createError
      profile = newProfile
    }

    if (profile.role === 'admin' && !profile.is_approved) {
      await supabase.auth.signOut()
      throw new Error('Your teacher/admin account is pending superadmin approval.')
    }

    return profile;
  },

  async signInAnonymously(displayName: string): Promise<Profile> {
    const { data: authData, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!authData.user) throw new Error('Guest login failed')

    // Check if the profile was already created by a trigger
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (existingProfile) {
      // If a trigger created it, let's update it with the entered nickname/display_name
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          username: existingProfile.username || `guest_${authData.user.id.substring(0, 8)}`
        })
        .eq('id', authData.user.id)
        .select()
        .single()
      if (updateError) throw updateError
      return updatedProfile
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: `guest_${authData.user.id}@quizverse.app`,
        username: `guest_${authData.user.id.substring(0, 8)}`,
        display_name: displayName,
        role: 'student',
        avatar_seed: generateAvatarSeed(),
        avatar_style: 'adventurer',
        xp: 0,
        level: 1,
      })
      .select()
      .single()

    if (profileError) throw profileError
    return profile
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
