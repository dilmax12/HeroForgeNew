import { defineConfig } from 'vite'
import reactSWC from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [reactSWC()],
  base: process.env.VITE_GITHUB_PAGES === 'true' ? '/HeroForgeNew/' : '/',
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
})
