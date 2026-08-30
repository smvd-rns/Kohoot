import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'
import { THEMES } from '@/lib/utils'
import {
  Zap, Users, BarChart2, Palette, Shield, Globe,
  Play, Star, ArrowRight, CheckCircle, Sparkles,
} from 'lucide-react'

const features = [
  { icon: Zap,       title: 'Real-time Quizzes',      desc: 'Kahoot-like live sessions with instant leaderboards and animations', color: '#7c6fef' },
  { icon: Users,     title: 'Multiplayer Lobbies',     desc: 'Students join with a room code or QR — no app download needed',     color: '#f928b8' },
  { icon: BarChart2, title: 'Deep Analytics',          desc: 'Detailed reports per quiz, student, and session with charts',         color: '#00f0ff' },
  { icon: Palette,   title: '7 Beautiful Themes',      desc: 'Krishna, Space, Festival, School — or build your own theme',         color: '#ffd700' },
  { icon: Shield,    title: 'Role-based Access',        desc: 'Super Admin, Admin, and Student roles with granular permissions',    color: '#22c55e' },
  { icon: Globe,     title: 'Multi-language Ready',    desc: 'Internationalization support for regional schools and classrooms',    color: '#f97316' },
]

const stats = [
  { value: '10+', label: 'Question Types' },
  { value: '7',   label: 'Built-in Themes' },
  { value: '∞',   label: 'Students' },
  { value: '100%', label: 'Free to Start' },
]

const themeColors = ['#7c6fef', '#00f0ff', '#1e6ea7', '#16a34a', '#10b981', '#ff6b35', '#6366f1']

const questionTypes = [
  '✅ Single Option Select', '🔵 True / False', '✨ Multi Select',
  '✍️ Fill in the Blank', '🖼️ Image Questions', '🎵 Audio Questions',
  '🎬 Video Questions', '📊 Polls', '🧩 Puzzle Arrange', '💬 Open Ended',
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <span className="text-white font-black text-lg">Q</span>
            </div>
            <span className="text-xl font-black gradient-text">QuizVerse</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Login</Button>
            <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-20 stars-bg">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
            style={{ background: 'rgba(124,111,239,0.15)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl"
            style={{ background: 'rgba(249,40,184,0.12)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.12, 0.2, 0.12] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/30 text-sm font-medium text-brand-400 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            The Premium Kahoot Alternative for Schools
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-fluid-xl font-black leading-tight mb-6"
          >
            Make Learning{' '}
            <span className="gradient-text">Unforgettable</span>
            <br />
            with Interactive Quizzes
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-theme-secondary max-w-2xl mx-auto mb-10"
          >
            Create stunning quizzes, launch live sessions, and engage students like never before.
            Real-time leaderboards, confetti celebrations, and 7 gorgeous themes included.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Button size="xl" onClick={() => navigate('/register')} rightIcon={<ArrowRight className="w-5 h-5" />}>
              Start for Free
            </Button>
            <Button size="xl" variant="outline" onClick={() => navigate('/login')} leftIcon={<Play className="w-5 h-5" />}>
              Join a Quiz
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
          >
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black gradient-text">{s.value}</p>
                <p className="text-sm text-theme-secondary mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Mock quiz card ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative glass-strong rounded-3xl p-8 lg:p-12 overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-brand opacity-5 rounded-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              {/* Mock quiz UI */}
              <div>
                <div className="glass rounded-2xl p-6 mb-4">
                  {/* Timer bar */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-theme-secondary">Question 3 of 10</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-warning-400">⏱ 12s</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full mb-6">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-brand"
                      initial={{ width: '100%' }}
                      animate={{ width: '40%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  </div>
                  <p className="text-xl font-bold text-theme-primary mb-6">
                    What is the capital of France? 🗼
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Paris 🇫🇷', 'London 🇬🇧', 'Berlin 🇩🇪', 'Rome 🇮🇹'].map((opt, i) => (
                      <motion.div
                        key={opt}
                        whileHover={{ scale: 1.03 }}
                        className={`p-4 rounded-xl font-bold text-white text-sm cursor-pointer transition-all ${
                          ['quiz-answer-a','quiz-answer-b','quiz-answer-c','quiz-answer-d'][i]
                        } ${i === 0 ? 'ring-4 ring-white/50 scale-105' : ''}`}
                      >
                        {opt}
                      </motion.div>
                    ))}
                  </div>
                </div>
                {/* Leaderboard preview */}
                <div className="glass rounded-2xl p-4">
                  <p className="text-sm font-bold text-theme-secondary mb-3">🏆 Live Leaderboard</p>
                  {[{ name: 'Priya K.', score: 1250, emoji: '🥇' }, { name: 'Rohan M.', score: 1100, emoji: '🥈' }, { name: 'Asha T.', score: 980, emoji: '🥉' }].map(p => (
                    <div key={p.name} className="flex items-center gap-3 py-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="flex-1 text-sm font-medium text-theme-primary">{p.name}</span>
                      <span className="text-sm font-black text-brand-400">{p.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-3xl font-black text-theme-primary mb-4">
                  A Live Quiz Experience Students <span className="gradient-text">Love</span>
                </h2>
                <p className="text-theme-secondary mb-8">
                  Full-screen mode, countdown timers, score celebrations, and a real-time leaderboard between questions.
                  Students stay engaged from start to finish.
                </p>
                <div className="space-y-3">
                  {['Confetti & podium animations', 'Real-time score updates', 'XP points & achievement badges', 'QR code & room code joining'].map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success-400 flex-shrink-0" />
                      <span className="text-theme-primary">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-fluid-lg font-black text-theme-primary mb-4">
              Everything You Need to <span className="gradient-text">Engage & Educate</span>
            </h2>
            <p className="text-theme-secondary max-w-2xl mx-auto">
              Built for teachers, coaching institutes, and educators who want more than basic quizzes.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="glass rounded-2xl p-6 card-hover"
              >
                <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center" style={{ background: `${f.color}22` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-bold text-theme-primary mb-2">{f.title}</h3>
                <p className="text-sm text-theme-secondary">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Question types ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-fluid-lg font-black text-theme-primary mb-4"
          >
            10 Powerful <span className="gradient-text">Question Types</span>
          </motion.h2>
          <p className="text-theme-secondary mb-12">From simple multiple choice to audio, video, and puzzle questions.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {questionTypes.map((qt, i) => (
              <motion.div
                key={qt}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass px-4 py-2 rounded-full text-sm font-medium text-theme-primary"
              >
                {qt}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Themes ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-fluid-lg font-black text-theme-primary mb-4"
          >
            7 Stunning <span className="gradient-text">Themes</span>
          </motion.h2>
          <p className="text-theme-secondary mb-12">Switch between themes instantly — even during a live quiz.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {THEMES.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-16 h-16 rounded-2xl shadow-lg"
                  style={{ background: t.gradient }}
                >
                  <div className="w-full h-full flex items-center justify-center text-2xl">{t.emoji}</div>
                </div>
                <span className="text-xs font-semibold text-theme-secondary">{t.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-brand opacity-10" />
            <div className="relative">
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-3xl font-black text-theme-primary mb-4">
                Ready to Transform Your Classroom?
              </h2>
              <p className="text-theme-secondary mb-8">
                Free forever on Supabase + Vercel. No credit card required.
                Start creating quizzes in minutes.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="xl" onClick={() => navigate('/register')}>
                  Create Free Account
                </Button>
                <Button size="xl" variant="outline" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </div>
              <div className="mt-8 flex justify-center gap-6 text-sm text-theme-secondary">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-warning-400" /> Free forever</span>
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-success-400" /> Secure</span>
                <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-brand-400" /> No setup</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-theme py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <span className="font-black gradient-text">QuizVerse</span>
          </div>
          <p className="text-sm text-theme-secondary">© 2025 QuizVerse. Built with ❤️ for educators worldwide.</p>
        </div>
      </footer>
    </div>
  )
}
