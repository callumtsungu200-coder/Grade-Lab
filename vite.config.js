import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site works from any path (e.g. Netlify drag-and-drop).
export default defineConfig({
  base: './',
  plugins: [react()],
})
