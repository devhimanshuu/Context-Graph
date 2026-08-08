import path from 'node:path'
import { defineConfig } from 'vitest/config'

/* Vitest configuration for API unit tests. Shared packages are aliased to their TypeScript sources so tests run */
export default defineConfig({
  resolve: {
    alias: {
      '@contextgraph/types': path.resolve(__dirname, '../../packages/types/src'),
      '@contextgraph/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@contextgraph/config': path.resolve(__dirname, '../../packages/config/src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/app.module.ts'],
    },
  },
})
