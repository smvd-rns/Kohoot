import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('framer-motion')) return 'framer'
            if (id.includes('recharts')) return 'charts'
            if (id.includes('@dnd-kit')) return 'dnd'
            if (id.includes('react-hook-form') || id.includes('zod')) return 'forms'
          }
        },
      },
    },
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
})
