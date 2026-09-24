import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Noyau métier partagé avec l'Edge Function (règles, prix, validation).
// Le front l'importe via l'alias @core/* : une seule source de vérité.
const coreDir = fileURLToPath(new URL('./supabase/functions/_shared/core', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': coreDir,
    },
  },
  server: {
    fs: {
      allow: ['.', coreDir],
    },
  },
})
