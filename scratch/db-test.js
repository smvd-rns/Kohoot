import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Simple .env parser
const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const value = parts.slice(1).join('=').trim()
    env[key] = value
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Signing in as test@gmail.com...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@gmail.com',
    password: '12345678'
  })
  
  if (authError) {
    console.error("Auth error:", authError)
    return
  }
  
  console.log("Calling getAdminSessions with alias...")
  const { data: sessions, error: sErr } = await supabase
    .from('quiz_sessions')
    .select('*, quiz:quizzes(title, thumbnail_url), participants:session_participants(count)')
    .eq('admin_id', authData.user.id)
  console.log("Sessions:", sessions, sErr)
}

test()
