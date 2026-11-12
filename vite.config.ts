import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// `npm run build:reel` writes a static copy into notes-brain/trailer/builds/game,
// where the reel pages embed it (same origin as the exporter).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5180 },
  build: {
    outDir: process.env.OUT_DIR || 'dist',
    emptyOutDir: true,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), reel: resolve(__dirname, 'reel.html') } },
  },
})
