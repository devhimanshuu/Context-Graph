import path from 'node:path'
import { defineConfig } from 'vitest/config'

/* End-to-end test configuration: boots the full NestJS application and drives */
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
    include: ['test/e2e/**/*.e2e-spec.ts'],
    testTimeout: 30000,
  },
})
