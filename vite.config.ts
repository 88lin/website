import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 是必须的——站点部署在 88lin.github.io/website/ 子路径下，
// 绝对路径会 404。CSS 里的 url('/fonts/...') 由 Vite 改写成相对路径，
// 这条已在线上验证过。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/gsap')) return 'gsap'
          if (id.includes('node_modules/lenis')) return 'lenis'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
})
