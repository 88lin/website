import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相对 base 同时兼容 dev.88lin.eu.org 根路径和 /website/ 子路径预览。
// CSS 的字体 URL 也由 Vite 改写，深层案例可直接打开。
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
