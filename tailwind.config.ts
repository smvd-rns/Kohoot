import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette
        brand: {
          50:  '#f0f0ff',
          100: '#e2e2ff',
          200: '#c8c7ff',
          300: '#a9a7ff',
          400: '#8a85ff',
          500: '#7c6fef',
          600: '#6d57e0',
          700: '#5b44c5',
          800: '#4b38a1',
          900: '#3d2f7f',
          950: '#251b4b',
        },
        // Accent
        accent: {
          50:  '#fff0fb',
          100: '#ffe0f7',
          200: '#ffc1ef',
          300: '#ff93e3',
          400: '#ff55cf',
          500: '#f928b8',
          600: '#dd0898',
          700: '#b50078',
          800: '#960062',
          900: '#7c0052',
        },
        // Success green
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        // Warning
        warning: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        // Danger
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c6fef 0%, #f928b8 100%)',
        'gradient-dark':  'linear-gradient(135deg, #1a1040 0%, #0f0825 100%)',
        'gradient-space': 'linear-gradient(135deg, #020817 0%, #0a192f 50%, #0d2137 100%)',
        'gradient-festival': 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 50%, #efefd0 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'float':        'float 3s ease-in-out infinite',
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
        'slide-up':     'slideUp 0.4s ease-out',
        'slide-down':   'slideDown 0.4s ease-out',
        'bounce-in':    'bounceIn 0.5s cubic-bezier(0.36,0.07,0.19,0.97)',
        'spin-slow':    'spin 8s linear infinite',
        'timer-drain':  'timerDrain linear forwards',
        'score-pop':    'scorePop 0.6s cubic-bezier(0.175,0.885,0.32,1.275)',
        'confetti-fall':'confettiFall 3s linear forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,111,239,0.4)' },
          '50%':      { boxShadow: '0 0 40px rgba(124,111,239,0.8), 0 0 60px rgba(249,40,184,0.3)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        timerDrain: {
          from: { width: '100%' },
          to:   { width: '0%' },
        },
        scorePop: {
          '0%':   { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.2) rotate(5deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        confettiFall: {
          '0%':   { transform: 'translateY(-100px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      boxShadow: {
        'glow':        '0 0 20px rgba(124,111,239,0.5)',
        'glow-pink':   '0 0 20px rgba(249,40,184,0.5)',
        'glow-green':  '0 0 20px rgba(34,197,94,0.5)',
        'card':        '0 4px 24px rgba(0,0,0,0.08)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.16)',
        'glass':       '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
