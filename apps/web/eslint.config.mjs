import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import eslintConfigPrettier from 'eslint-config-prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      // Isolated Next build dirs used when a dev server already owns `.next`.
      '.next-verify/**',
      '.next-preview/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
  {
    rules: {
      // Enterprise guardrail: the codebase must stay free of `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // Direct `console` access is allowed only through the logging module;
      // whitelist the severity methods the ConsoleLogger uses.
      'no-console': ['warn', { allow: ['debug', 'info', 'warn', 'error'] }],
      // Prefer `import { type Foo }` over `import type { Foo }` so type-only
      // imports can be grouped with value imports by the same module.
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // Parameters/vars prefixed with `_` are intentionally unused (interface
      // conformance) — the standard signal to ignore them.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Turn off ESLint rules that conflict with Prettier formatting.
  eslintConfigPrettier,
]

export default eslintConfig
