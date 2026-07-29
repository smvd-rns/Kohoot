# QuizVerse 🎮

> The premium Kahoot alternative for schools, coaching institutes, and educational organizations.

[![Built with Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

## ✨ Features

### Quiz Builder
- **10 question types**: Multiple Choice, True/False, Multi-Select, Fill in the Blank, Image, Audio, Video, Poll, Puzzle, Open Ended
- Drag-and-drop question reordering
- Per-question time limits and point values
- Answer explanations

### Live Quiz Experience
- Room code + QR code joining
- Full-screen Kahoot-style quiz flow
- Real-time countdown timer with animated ring
- Score feedback after each answer
- Real-time leaderboard between questions
- Confetti + animated podium on completion

### 7 Beautiful Themes
| Theme | Description |
|---|---|
| ✨ Modern | Premium glassmorphism (default) |
| 🚀 Space | Cosmic dark with neon |
| 🦚 Krishna | Peacock blue & gold |
| 📚 School | Friendly green & yellow |
| 🌙 Dark | Developer dark mode |
| 🎉 Festival | Vibrant orange & gold |
| 🎨 Minimal | Clean & professional |

### User Roles
- **Super Admin** — Platform-wide management
- **Admin / Teacher** — Create quizzes, manage sessions, view analytics
- **Student** — Join quizzes, earn badges, track progress

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A free Supabase account

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd quizverse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=QuizVerse
VITE_APP_URL=http://localhost:5173
```

## 🗃️ Database Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the dashboard
3. Run `supabase/migrations/001_initial_schema.sql`
4. Run `supabase/seed.sql`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/          # Reusable primitives (Button, Card, Input, etc.)
│   ├── layout/      # AdminLayout, StudentLayout, AuthLayout, Sidebar
│   └── quiz/        # Quiz-specific components
├── pages/
│   ├── auth/        # Login, Register
│   ├── admin/       # Dashboard, Quiz Builder, Analytics, etc.
│   ├── student/     # Dashboard, Join, Play, Results
│   ├── superadmin/  # Platform management
│   └── public/      # Landing page
├── services/        # Supabase API calls
├── store/           # Zustand state (auth, quiz, theme)
├── lib/             # Supabase client, utilities
├── types/           # TypeScript interfaces
└── router/          # React Router config with auth guards
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 + Framer Motion |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| QR Code | qrcode.react |
| Avatars | DiceBear |
| Export | xlsx + CSV |

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment to Vercel + Supabase.

## 📜 License

MIT © QuizVerse
