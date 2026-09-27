import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Noyau métier partagé avec l'Edge Function (règles, prix, validation).
// Le front l'importe via l'alias @core/* : une seule source de vérité.
const coreDir = fileURLToPath(new URL('./supabase/functions/_shared/core', import.meta.url))

// index.html : remplace __APP_URL__ par l'adresse publique du Composeur
// (VITE_APP_URL), nécessaire aux balises og:image / og:url qui doivent être
// des adresses complètes. Sans la variable, les chemins restent relatifs.
function appUrlInHtml(appUrl: string): Plugin {
  return {
    name: 'app-url-in-html',
    transformIndexHtml: (html) => html.replaceAll('__APP_URL__', appUrl.replace(/\/+$/, '')),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), appUrlInHtml(loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_URL ?? '')],
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
}))
