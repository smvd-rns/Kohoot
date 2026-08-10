import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gradient' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'gradient', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants = {
      gradient: 'btn-gradient text-white shadow-lg',
      outline:  'border border-theme bg-transparent text-theme-primary hover:bg-white/5',
      ghost:    'bg-transparent text-theme-secondary hover:bg-white/5 hover:text-theme-primary',
      danger:   'bg-danger-500 text-white hover:bg-danger-600 shadow-lg',
      success:  'bg-success-500 text-white hover:bg-success-600 shadow-lg',
    }

    const sizes = {
      xs:  'px-3 py-1.5 text-xs',
      sm:  'px-4 py-2 text-sm',
      md:  'px-5 py-2.5 text-sm',
      lg:  'px-6 py-3 text-base',
      xl:  'px-8 py-4 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-theme-secondary">
            {label}
            {props.required && <span className="text-danger-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-field',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger-500 focus:ring-danger-500/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-danger-400 flex items-center gap-1">⚠ {error}</p>}
        {hint && !error && <p className="text-xs text-theme-secondary">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-theme-secondary">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn('input-field resize-none min-h-[100px]', error && 'border-danger-500', className)}
          {...props}
        />
        {error && <p className="text-xs text-danger-400">⚠ {error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-theme-secondary">{label}</label>}
        <select
          ref={ref}
          id={inputId}
          className={cn('input-field cursor-pointer', error && 'border-danger-500', className)}
          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
              {placeholder}
            </option>
          )}
          {options.map(o => (
            <option 
              key={o.value} 
              value={o.value} 
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            >
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-danger-400">⚠ {error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ── Toggle ────────────────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <motion.div
          className={cn('w-11 h-6 rounded-full transition-colors duration-200', checked ? 'bg-brand-500' : 'bg-white/20')}
          layout
        >
          <motion.div
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
            animate={{ x: checked ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.div>
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-theme-primary">{label}</p>}
          {description && <p className="text-xs text-theme-secondary mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, hover = false, onClick, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.2)' } : undefined}
      className={cn('glass rounded-2xl', paddings[padding], hover && 'cursor-pointer', className)}
    >
      {children}
    </motion.div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-theme-primary',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    danger:  'bg-danger-500/20 text-danger-400',
    info:    'bg-blue-500/20 text-blue-400',
    purple:  'bg-brand-500/20 text-brand-400',
  }
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
interface AvatarProps {
  seed: string
  style?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  border?: boolean
}

export function Avatar({ seed, style = 'adventurer', size = 'md', className, border = false }: AvatarProps) {
  const sizes = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20' }
  const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`
  return (
    <div className={cn('rounded-full overflow-hidden flex-shrink-0', sizes[size], border && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent', className)}>
      <img src={url} alt="avatar" className="w-full h-full object-cover" />
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn('border-2 border-white/20 border-t-brand-500 rounded-full animate-spin', sizes[size], className)} />
  )
}

// ── Progress ──────────────────────────────────────────────────────────────────
interface ProgressProps {
  value: number   // 0-100
  max?: number
  className?: string
  color?: string
  height?: number
  animated?: boolean
  label?: string
}

export function Progress({ value, max = 100, className, color, height = 8, animated = false, label }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full', className)}>
      {label && <div className="flex justify-between text-xs text-theme-secondary mb-1"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className="w-full rounded-full overflow-hidden" style={{ height }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color ?? 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: animated ? 1 : 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideClose?: boolean
}

export function Modal({ open, onClose, title, children, size = 'md', hideClose }: ModalProps) {
  const sizes = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  }
  if (!open) return null
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className={cn('relative w-full bg-[var(--color-bg-secondary)] border border-theme rounded-3xl overflow-hidden shadow-2xl', sizes[size])}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between p-6 border-b border-theme">
            {title && <h2 className="text-xl font-bold text-theme-primary">{title}</h2>}
            {!hideClose && (
              <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-theme-secondary hover:text-theme-primary transition-colors">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-theme-primary mb-2">{title}</h3>
      {description && <p className="text-theme-secondary text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  trend?: { value: number; label: string }
  color?: string
}

export function StatCard({ icon, label, value, sub, trend, color }: StatCardProps) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-theme-secondary font-medium mb-1">{label}</p>
          <p className="text-3xl font-black text-theme-primary">{value}</p>
          {sub && <p className="text-xs text-theme-secondary mt-0.5">{sub}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-2', trend.value >= 0 ? 'text-success-400' : 'text-danger-400')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: color ?? 'rgba(124,111,239,0.15)' }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
