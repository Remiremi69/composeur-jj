import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reprend la config Vite (dont l'alias @core) pour les tests.
// Les tests du noyau tournent sous Node ; ceux de l'interface (.tsx) sous
// jsdom (déclaré en tête de fichier).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      environment: 'node',
      // Valeurs factices : src/lib/supabase.ts refuse de démarrer sans elles.
      // Aucun appel réseau n'est fait (les appels sont simulés dans les tests).
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'cle-de-test',
      },
    },
  }),
)
