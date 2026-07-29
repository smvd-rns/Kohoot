import { supabase } from '@/lib/supabase'
import type { Profile, AuthFormData } from '@/types'
import { generateAvatarSeed } from '@/lib/utils'

export const authService = {
  async signUp(data: AuthFormData & { display_name: string; role: 'admin' | 'student' }): Promise<Profile> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          display_name: data.display_name,
          role: data.role,
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) throw profileError
    return profile
  },

  async signInAnonymously(displayName: string): Promise<Profile> {
    const { data: authData, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!authData.user) throw new Error('Guest login failed')

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
