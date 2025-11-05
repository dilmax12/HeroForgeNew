import { defineConfig } from 'vite'
import reactSWC from '@vitejs/plugin-react-swc'

// Detectar plataforma de deploy
const isGitHubPages = process.env.VITE_GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true'
const isVercel = process.env.VERCEL === '1'

export default defineConfig({
  plugins: [reactSWC()],
  base: isGitHubPages ? '/HeroForgeNew/' : '/', // GitHub Pages precisa do subpath, Vercel usa root
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
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
