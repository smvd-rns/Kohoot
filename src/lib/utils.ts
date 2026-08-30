import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance } from 'date-fns'
import type { ThemeConfig, QuizTheme } from '@/types'

// ── Tailwind class merger ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Room code generator ───────────────────────────────────────────────────────
export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Avatar seed generator ─────────────────────────────────────────────────────
export function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 10)
}

// ── Get avatar URL from DiceBear ──────────────────────────────────────────────
export function getAvatarUrl(seed: string, style = 'adventurer'): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
}

// ── Format date ───────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt)
}

export function timeAgo(date: string | Date): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

// ── Format duration ───────────────────────────────────────────────────────────
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ── Score percentage ──────────────────────────────────────────────────────────
export function scorePercent(score: number, total: number): number {
  if (total === 0) return 0
  return Math.round((score / total) * 100)
}

// ── XP needed for next level ──────────────────────────────────────────────────
export function xpForLevel(level: number): number {
  return Math.round(level * 100 * (1 + level * 0.1))
}

// ── Level from XP ────────────────────────────────────────────────────────────
export function levelFromXp(xp: number): number {
  let level = 1
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level++
  }
  return level
}

// ── Score grade ───────────────────────────────────────────────────────────────
export function scoreGrade(percent: number): { label: string; color: string; emoji: string } {
  if (percent >= 90) return { label: 'Excellent!', color: '#22c55e', emoji: '🏆' }
  if (percent >= 75) return { label: 'Great Job!', color: '#84cc16', emoji: '🌟' }
  if (percent >= 60) return { label: 'Good!', color: '#eab308', emoji: '👍' }
  if (percent >= 40) return { label: 'Keep Trying!', color: '#f97316', emoji: '💪' }
  return { label: 'Better luck next time', color: '#ef4444', emoji: '📚' }
}

// ── Themes ────────────────────────────────────────────────────────────────────
export const THEMES: ThemeConfig[] = [
  { id: 'modern',   name: 'Modern',   description: 'Premium glassmorphism',   preview_color: '#7c6fef', gradient: 'linear-gradient(135deg,#7c6fef,#f928b8)', emoji: '✨' },
  { id: 'space',    name: 'Space',    description: 'Cosmic dark adventure',   preview_color: '#00f0ff', gradient: 'linear-gradient(135deg,#00f0ff,#7928ca)', emoji: '🚀' },
  { id: 'krishna',  name: 'Krishna',  description: 'Festive spiritual vibes', preview_color: '#1e6ea7', gradient: 'linear-gradient(135deg,#1e6ea7,#ffd700)', emoji: '🦚' },
  { id: 'school',   name: 'School',   description: 'Friendly & educational',  preview_color: '#16a34a', gradient: 'linear-gradient(135deg,#16a34a,#eab308)', emoji: '📚' },
  { id: 'dark',     name: 'Dark',     description: 'Developer dark mode',     preview_color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#3b82f6)', emoji: '🌙' },
  { id: 'festival', name: 'Festival', description: 'Vibrant celebration',     preview_color: '#ff6b35', gradient: 'linear-gradient(135deg,#ff6b35,#ffd700)', emoji: '🎉' },
  { id: 'minimal',  name: 'Minimal',  description: 'Clean & professional',    preview_color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', emoji: '🎨' },
]

export function getTheme(id: QuizTheme): ThemeConfig {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

// ── Apply theme to document ───────────────────────────────────────────────────
export function applyTheme(theme: QuizTheme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Single Option Select',
  true_false:      'True / False',
  multi_select:    'Multi Select',
  fill_blank:      'Fill in the Blank',
  image_based:     'Image Question',
  video_based:     'Video Question',
  poll:            'Poll',
  open_ended:      'Open Ended',
}

// ── Truncate text ─────────────────────────────────────────────────────────────
export function truncate(text: string, max = 50): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── Random int ───────────────────────────────────────────────────────────────
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── Avatar styles ───────────────────────────────────────────────────────────
export const AVATAR_STYLES = ['adventurer', 'avataaars', 'bottts', 'croodles', 'fun-emoji', 'icons', 'lorelei', 'micah', 'miniavs', 'notionists', 'open-peeps', 'personas', 'pixel-art']

// ── Debounce ─────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Media Embeds ──────────────────────────────────────────────────────────────
export function getEmbedUrl(url: string | undefined): string | null {
  if (!url) return null
  
  // Extract video ID for YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const ytMatch = url.match(youtubeRegex)
  if (ytMatch && ytMatch[1]) {
    // Check for start time (t= or start=)
    const timeMatch = url.match(/[?&](?:t|start)=([^&]+)/i)
    let timeParam = ''
    if (timeMatch && timeMatch[1]) {
      // YouTube embed start is in seconds.
      let timeStr = timeMatch[1]
      // if it has 'h', 'm', 's' parse it, else assume seconds
      let seconds = 0
      if (timeStr.includes('h') || timeStr.includes('m') || timeStr.includes('s')) {
        const hMatch = timeStr.match(/(\d+)h/i)
        const mMatch = timeStr.match(/(\d+)m/i)
        const sMatch = timeStr.match(/(\d+)s/i)
        if (hMatch) seconds += parseInt(hMatch[1]) * 3600
        if (mMatch) seconds += parseInt(mMatch[1]) * 60
        if (sMatch) seconds += parseInt(sMatch[1])
      } else {
        seconds = parseInt(timeStr) || 0
      }
      if (seconds > 0) {
        timeParam = `?start=${seconds}`
      }
    }
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}${timeParam}`
  }

  // Extract video ID for Vimeo
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i
  const vimeoMatch = url.match(vimeoRegex)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return url
}
