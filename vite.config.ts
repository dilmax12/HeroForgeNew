import { defineConfig } from 'vite'
import reactSWC from '@vitejs/plugin-react-swc'

// Detectar se estamos no GitHub Pages
const isGitHubPages = process.env.VITE_GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [reactSWC()],
  base: '/HeroForgeNew/', // Forçar sempre para GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  server: {
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
