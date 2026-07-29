import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EmptyState } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { studentService } from '@/services/student.service'
import { formatDate, cn } from '@/lib/utils'

const BADGE_COLORS = ['#7c6fef', '#f928b8', '#00f0ff', '#22c55e', '#ffd700', '#f97316']

export default function AchievementsPage() {
  const { profile } = useAuthStore()
  const [achievements, setAchievements] = useState<unknown[]>([])

  useEffect(() => {
    if (!profile?.id) return
    studentService.getAchievements(profile.id).then(setAchievements)
  }, [profile?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-theme-primary">Achievements</h1>
        <p className="text-theme-secondary text-sm">{achievements.length} badges earned</p>
      </div>

      {achievements.length === 0 ? (
        <EmptyState icon="🏆" title="No achievements yet" description="Complete quizzes to earn badges and XP rewards!" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {(achievements as Array<{ id: string; earned_at: string; achievement: { name: string; description: string; icon: string; color: string; xp_reward: number } }>).map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: 'spring' }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="glass rounded-2xl p-5 text-center"
            >
              <div className="text-5xl mb-3">{a.achievement.icon}</div>
              <p className="font-bold text-theme-primary text-sm">{a.achievement.name}</p>
              <p className="text-xs text-theme-secondary mt-1 mb-3 line-clamp-2">{a.achievement.description}</p>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{ background: `${BADGE_COLORS[i % BADGE_COLORS.length]}20`, color: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                +{a.achievement.xp_reward} XP
              </div>
              <p className="text-xs text-theme-secondary mt-2">{formatDate(a.earned_at)}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
