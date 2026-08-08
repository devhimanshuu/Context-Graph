import { relative } from 'node:path'

const toSlash = (p) => p.replace(/\\/g, '/')
const rel = (dir, files) => files.map((file) => toSlash(relative(dir, file))).join(' ')

/**
 * Monorepo-aware lint-staged tasks.
 *
 * ESLint and Prettier are executed from inside a workspace so they resolve that
 * workspace's own binaries, configs and plugin packages:
 *  - `eslint-config-next`'s `@rushstack/eslint-patch` can only patch the ESLint
 *    instance it shares a module tree with, so `apps/web` must run its LOCAL
 *    `eslint` binary (a root-hoisted copy fails with "calling module was not
 *    recognized").
 *  - Prettier resolves `prettier-plugin-tailwindcss` from the CWD (not from the
 *    config file's directory), so `apps/web` files — whose `.prettierrc.json`
 *    lists the plugin — must be formatted from `apps/web`.
 */
const runIn = (dir) => (files) => [
  `npx --prefix ${dir} eslint --fix ${rel(dir, files)}`,
  `npx --prefix ${dir} prettier --write ${rel(dir, files)}`,
]

/** Prettier from the workspace for apps/web files (tailwind plugin), root otherwise. */
const prettierPerWorkspace = (files) => {
  const grouped = new Map()
  for (const file of files) {
    const dir = file.startsWith('apps/web/') ? 'apps/web' : '.'
    grouped.set(dir, [...(grouped.get(dir) ?? []), file])
  }
  return [...grouped].map(([dir, list]) =>
    dir === '.'
      ? `prettier --write ${list.join(' ')}`
      : `npx --prefix ${dir} prettier --write ${rel(dir, list)}`,
  )
}

export default {
  'apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx}': runIn('apps/web'),
  'apps/api/**/*.{js,jsx,mjs,cjs,ts,tsx}': [
    // apps/api has no workspace-local eslint/prettier (hoisted to root), and its
    // configs do not depend on workspace-local packages, so root works.
    'eslint --config apps/api/eslint.config.mjs --fix',
    'prettier --write',
  ],
  'packages/**/*.{js,jsx,mjs,cjs,ts,tsx}': ['prettier --write'],
  '*.{json,md,css,yml,yaml}': prettierPerWorkspace,
}
