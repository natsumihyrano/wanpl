import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // サブディレクトリや静的アップでも読めるように相対パスにする
  base: './',
  plugins: [react()],
  server: {
    hmr: true,
    watch: {
      // エディタ保存や外部更新を確実に拾う
      usePolling: true,
      interval: 300,
    },
  },
})
