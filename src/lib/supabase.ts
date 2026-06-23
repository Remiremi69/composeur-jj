import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes. " +
      'Vérifie que .env.local contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY, ' +
      'puis relance le serveur (npm run dev).',
  )
}

// Client public : utilise la clé anon, protégée par les politiques RLS.
// Jamais la clé service_role ici (réservée aux Edge Functions).
export const supabase = createClient(url, anonKey)
