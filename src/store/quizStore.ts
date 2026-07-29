import { create } from 'zustand'
import type { QuizPlayState, LeaderboardEntry, Question, SessionParticipant, QuizSession } from '@/types'

interface QuizStore extends QuizPlayState {
  initSession: (session: QuizSession, participant: SessionParticipant, questions: Question[]) => void
  setCurrentQuestion: (index: number) => void
  selectOption: (optionId: string, isMulti?: boolean) => void
  setTextAnswer: (text: string) => void
  submitAnswer: (isCorrect: boolean, points: number) => void
  showLeaderboardScreen: (leaderboard: LeaderboardEntry[]) => void
  nextQuestion: () => void
  finishQuiz: () => void
  reset: () => void
}

const initialState: QuizPlayState = {
  session: null,
  participant: null,
  currentQuestion: null,
  currentIndex: 0,
  totalQuestions: 0,
  timeRemaining: 30,
  selectedOptions: [],
  textAnswer: '',
  hasAnswered: false,
  showResult: false,
  isCorrect: null,
  pointsEarned: 0,
  leaderboard: [],
  showLeaderboard: false,
  isFinished: false,
}

export const useQuizStore = create<QuizStore>()((set, get) => ({
  ...initialState,

  initSession: (session, participant, questions) =>
    set({
      ...initialState,
      session,
      participant,
      totalQuestions: questions.length,
      currentQuestion: questions[0] ?? null,
      timeRemaining: questions[0]?.time_limit ?? 30,
    }),

  setCurrentQuestion: (index) => {
    const { session } = get()
    // Questions fetched from outside; this signals UI update
    set({ currentIndex: index, selectedOptions: [], textAnswer: '', hasAnswered: false, showResult: false, isCorrect: null, pointsEarned: 0, showLeaderboard: false })
  },

  selectOption: (optionId, isMulti = false) => {
    const { selectedOptions, hasAnswered } = get()
    if (hasAnswered) return
    if (isMulti) {
      const already = selectedOptions.includes(optionId)
      set({ selectedOptions: already ? selectedOptions.filter(o => o !== optionId) : [...selectedOptions, optionId] })
    } else {
      set({ selectedOptions: [optionId] })
    }
  },

  setTextAnswer: (text) => set({ textAnswer: text }),

  submitAnswer: (isCorrect, points) => {
    const { participant } = get()
    set({
      hasAnswered: true,
      showResult: true,
      isCorrect,
      pointsEarned: points,
      participant: participant
        ? { ...participant, score: participant.score + points, correct_answers: isCorrect ? participant.correct_answers + 1 : participant.correct_answers }
        : participant,
    })
  },

  showLeaderboardScreen: (leaderboard) => set({ leaderboard, showLeaderboard: true }),

  nextQuestion: () => {
    const { currentIndex, totalQuestions } = get()
    if (currentIndex + 1 >= totalQuestions) {
      set({ isFinished: true })
    } else {
      set({ currentIndex: currentIndex + 1, selectedOptions: [], textAnswer: '', hasAnswered: false, showResult: false, isCorrect: null, pointsEarned: 0, showLeaderboard: false })
    }
  },

  finishQuiz: () => set({ isFinished: true }),

  reset: () => set(initialState),
}))
