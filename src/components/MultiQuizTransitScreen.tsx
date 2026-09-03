import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { CheckCircle2, ChevronRight, Play, Zap, Flame, Award, Radio, ShieldCheck, Lock } from 'lucide-react'
import { Button } from '@/components/ui'

interface MultiQuizTransitScreenProps {
  quizList: Array<{ id: string; title: string }>
  currentQuizId?: string
  transitionMessages?: string[]
  isHost?: boolean
  isSelfPaced?: boolean
  onStartNextQuiz?: () => void
  loadingNext?: boolean
}

export function MultiQuizTransitScreen({
  quizList,
  currentQuizId,
  transitionMessages = [],
  isHost = false,
  isSelfPaced = false,
  onStartNextQuiz,
  loadingNext = false,
}: MultiQuizTransitScreenProps) {
  // Find index of current quiz
  const currentIdx = quizList.findIndex(q => q.id === currentQuizId)
  const completedIdx = currentIdx >= 0 ? currentIdx : 0
  const nextIdx = completedIdx + 1
  const completedQuiz = quizList[completedIdx]
  const nextQuiz = quizList[nextIdx] || quizList[completedIdx]
  const customMsg = transitionMessages[completedIdx] || 'Prepare yourself! The next round is launching shortly.'
  const progressPct = Math.round((Math.min(completedIdx + 1, quizList.length) / quizList.length) * 100)

  // 3D Parallax Tilt Effect (Disabled on small mobile touch screens)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [6, -6]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-6, 6]), { stiffness: 300, damping: 30 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="fixed inset-0 flex flex-col items-center justify-center p-3 sm:p-6 text-center overflow-y-auto z-40 selection:bg-brand-500 selection:text-white"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1c1538 0%, #0a0814 60%, #030208 100%)',
        perspective: 1000,
      }}
    >
      {/* Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.25, 0.45, 0.25],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[550px] h-[320px] sm:h-[550px] bg-gradient-to-r from-brand-600/30 via-purple-600/20 to-cyan-500/30 rounded-full blur-[90px] sm:blur-[120px]"
        />
      </div>

      {/* Main Container Card */}
      <motion.div
        style={{ rotateX, rotateY }}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 220 }}
        className="max-w-xl w-full p-[1.5px] rounded-[24px] sm:rounded-[32px] bg-gradient-to-b from-cyan-400/40 via-brand-500/30 to-purple-600/40 shadow-[0_0_50px_rgba(34,211,238,0.2)] relative overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        <div className="w-full p-4 sm:p-8 rounded-[22px] sm:rounded-[30px] space-y-4 sm:space-y-6 relative bg-slate-950/90 backdrop-blur-2xl border border-white/10 text-left overflow-y-auto">
          
          {/* Top Header Badge */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 sm:pb-4">
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0"
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 animate-pulse" />
              <span>Arena Event</span>
            </motion.div>

            <motion.div
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-brand-300 bg-brand-500/20 px-2.5 sm:px-3 py-1 rounded-full border border-brand-400/30 shrink-0"
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-bounce" />
              <span>Round {completedIdx + 1} / {quizList.length}</span>
            </motion.div>
          </div>

          {/* Hero Victory & Next Round */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 text-center sm:text-left">
            <motion.div
              animate={{ y: [-3, 3, -3], rotate: [-1, 1, -1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative shrink-0"
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-600 via-purple-500 to-amber-400 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-2xl sm:text-3xl">
                  🏆
                </div>
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase px-1.5 sm:px-2 py-0.5 rounded-full border border-white shadow-lg">
                Victory
              </span>
            </motion.div>

            <div className="space-y-1 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                <span>Round Completed!</span>
                <span className="text-lg">🎉</span>
              </h2>
              <p className="text-theme-secondary text-xs sm:text-sm leading-relaxed">
                {completedQuiz ? (
                  <>
                    Cleared <span className="text-cyan-300 font-bold">"{completedQuiz.title}"</span>. Next stage ready below.
                  </>
                ) : (
                  'Round completed! Preparing next stage.'
                )}
              </p>
            </div>
          </div>

          {/* Tournament Track Grid */}
          {quizList.length > 0 && (
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 sm:p-5 space-y-3 shadow-inner relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                  <span className="text-[11px] sm:text-xs font-black uppercase text-white tracking-wider">Tournament Track</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {progressPct}% Completed
                </span>
              </div>

              {/* Tournament Steps */}
              <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-1">
                {quizList.map((q, idx) => {
                  const isDone = idx <= completedIdx
                  const isNext = idx === nextIdx

                  return (
                    <motion.div
                      key={q.id || idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className={`relative p-2.5 sm:p-3.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                        isNext
                          ? 'bg-gradient-to-r from-cyan-500/20 via-brand-500/25 to-purple-500/20 border-cyan-400/70 text-white font-black shadow-[0_0_20px_rgba(34,211,238,0.2)] ring-1 ring-cyan-400/50'
                          : isDone
                          ? 'bg-white/5 border-white/10 text-theme-secondary opacity-90'
                          : 'bg-white/[0.02] border-white/5 text-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isDone ? (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                          </div>
                        ) : isNext ? (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-brand-500 text-white text-[11px] sm:text-xs font-black flex items-center justify-center shrink-0 shadow-[0_0_10px_#22d3ee] animate-pulse">
                            {idx + 1}
                          </div>
                        ) : (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 border border-white/10 text-white/40 text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                            <Lock className="w-3 h-3 opacity-60" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-wider">Stage {idx + 1}</p>
                          <p className={`text-xs sm:text-sm truncate font-black ${isNext ? 'text-cyan-300' : isDone ? 'text-white/80' : 'text-white/30'}`}>
                            {q.title}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            Passed ✓
                          </span>
                        ) : isNext ? (
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-cyan-200 bg-cyan-500/30 px-2.5 sm:px-3 py-0.5 rounded-full border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse">
                            Up Next 🚀
                          </span>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            Locked 🔒
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Broadcast Announcement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-r from-brand-900/40 via-slate-900/60 to-purple-900/40 border border-brand-500/30 rounded-2xl p-3 sm:p-4 space-y-1 relative overflow-hidden shadow-lg text-left"
          >
            <div className="flex items-center gap-1.5 text-brand-400 text-[11px] sm:text-xs font-black uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Host Live Transmission</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white italic leading-relaxed pl-1">
              "{customMsg}"
            </p>
          </motion.div>

          {/* Action Launch Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-1 space-y-2 sm:space-y-3"
          >
            {isHost || isSelfPaced ? (
              <div className="space-y-2">
                <Button
                  size="xl"
                  className="w-full font-black text-xs sm:text-base py-3.5 sm:py-4 px-4 bg-gradient-to-r from-cyan-500 via-brand-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.98] border border-cyan-300/40 uppercase tracking-wider"
                  leftIcon={isHost ? <Play className="w-4 h-4 fill-current shrink-0" /> : <ChevronRight className="w-5 h-5 animate-pulse shrink-0" />}
                  onClick={onStartNextQuiz}
                  isLoading={loadingNext}
                >
                  <span className="truncate max-w-[260px] sm:max-w-md">
                    {nextQuiz && nextIdx < quizList.length ? `LAUNCH STAGE ${nextIdx + 1}: ${nextQuiz.title}` : 'LAUNCH NEXT QUIZ'}
                  </span>
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-theme-secondary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Session Live · Room Code & QR Code active automatically</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2.5 text-[11px] sm:text-xs text-cyan-300 font-bold bg-cyan-500/10 py-3 px-3.5 rounded-xl border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0 shadow-[0_0_10px_#22d3ee]" />
                  <span>Host launching next stage... Please remain on screen.</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-theme-secondary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Auto-launches when host executes start command</span>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </motion.div>
    </div>
  )
}
