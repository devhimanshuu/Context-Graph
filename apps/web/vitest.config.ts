import path from 'node:path'
import { defineConfig } from 'vitest/config'

/* Vitest configuration for unit tests. Mirrors the `@/* → src/*` path alias from tsconfig so tests import exactly */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
