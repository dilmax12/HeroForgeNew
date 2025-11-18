import { defineConfig } from 'vite'
import reactSWC from '@vitejs/plugin-react-swc'

// Detectar plataforma de deploy
const isGitHubPages = process.env.VITE_GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [reactSWC()],
  base: isGitHubPages ? '/HeroForgeNew/' : '/', // GitHub Pages precisa do subpath, Vercel usa root
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand', 'use-sync-external-store'],
          router: ['react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          stripe: ['stripe'],
          ai: ['@huggingface/inference']
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    fs: {
      strict: false
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
})
