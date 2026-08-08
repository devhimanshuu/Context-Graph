import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/* ESLint flat config for the NestJS API. Policy: strict TypeScript, no `any`, no unused variables. Prettier handles */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.d.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // NOTE: consistent-type-imports is deliberately NOT enabled. With `emitDecoratorMetadata` (NestJS
      // DI), a type-only import erases the runtime class reference, so `design:paramtypes` degrades to ...
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
)
