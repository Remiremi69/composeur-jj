import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reprend la config Vite (dont l'alias @core) pour les tests.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  }),
)
