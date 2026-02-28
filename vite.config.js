import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6036,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
