# QuizVerse — Deployment Guide

## Overview

QuizVerse is deployed using:
- **Frontend**: Vercel (free hobby tier)
- **Backend + DB + Auth**: Supabase (free tier)

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose your organization, set a project name (e.g. `quizverse`), set a strong DB password, and choose a region close to your users
3. Wait ~2 minutes for the project to provision

---

## Step 2 — Configure Supabase

### Get your API keys
1. In the Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API Key (anon/public)** → `VITE_SUPABASE_ANON_KEY`

### Run the database migration
1. Go to **SQL Editor** in the Supabase dashboard
2. Click **New query**
3. Paste the entire content of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

### Run seed data
1. Open another SQL query
2. Paste the content of `supabase/seed.sql`
3. Click **Run**

### Enable Supabase Auth
1. Go to **Authentication → Settings**
2. Set **Site URL** to your Vercel domain (e.g. `https://quizverse.vercel.app`)
3. Add `http://localhost:5173` to **Redirect URLs** (for local dev)
4. Make sure **Email auth** is enabled

### Create Super Admin
1. Go to **Authentication → Users** → **Add User**
2. Set email and password for your super admin
3. Copy the user UUID
4. Run this SQL:
```sql
UPDATE profiles SET role = 'super_admin' WHERE id = 'YOUR_USER_UUID';
```

---

## Step 3 — Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
VITE_APP_NAME=QuizVerse
VITE_APP_URL=https://quizverse.vercel.app
```

---

## Step 4 — Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B — Vercel Dashboard (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Set the **Framework Preset** to **Vite**
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
   - `VITE_APP_URL` (your Vercel URL)
6. Click **Deploy**

The `vercel.json` file in the project root already handles SPA routing and security headers.

---

## Step 5 — Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Supabase Free Tier Limits

| Resource | Free Limit |
|---|---|
| Database storage | 500 MB |
| File storage | 1 GB |
| Bandwidth (egress) | 2 GB/month |
| Monthly active users | 50,000 |
| Realtime connections | 200 concurrent |
| API requests | Unlimited |

QuizVerse is optimized for the free tier:
- Uses external URLs for media (no file storage needed)
- DiceBear avatars (external CDN, no storage)
- Efficient RLS queries to minimize DB load

---

## Vercel Free Tier Limits

| Resource | Free Limit |
|---|---|
| Bandwidth | 100 GB/month |
| Serverless invocations | 100k/month |
| Build minutes | 6,000/month |
| Custom domains | Yes |

---

## Updating the App

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Vercel auto-deploys on git push to main branch
git push origin main
```

---

## Troubleshooting

### "Invalid JWT" errors
→ Check that your `VITE_SUPABASE_ANON_KEY` is correct

### Page not found on refresh
→ Make sure `vercel.json` is in the project root with the SPA rewrite rule

### Students can't join a session
→ Ensure the session status is `waiting` or `active` (not `completed`)

### Realtime not working
→ Verify that `ALTER PUBLICATION supabase_realtime ADD TABLE ...` was run successfully in the migration SQL

---

## Custom Domain

1. In Vercel dashboard → **Domains** → Add your domain
2. Update `VITE_APP_URL` environment variable
3. Update Supabase Auth **Site URL** to match
4. Redeploy
