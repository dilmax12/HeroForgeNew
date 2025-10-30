import { defineConfig } from 'vite'
import reactSWC from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [reactSWC()],
  base: process.env.VITE_GITHUB_PAGES === 'true' ? '/HeroForgeNew/' : '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
})
