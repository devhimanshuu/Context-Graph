import 'dotenv/config'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// When a prisma.config.ts is present, Prisma skips its automatic .env loading,
// so we load environment variables here explicitly. `.env.local` (Next.js
// convention) overrides `.env` (Prisma CLI convention).
dotenv.config({ path: '.env.local', override: true })

/**
 * Prisma configuration (Prisma 6.19+; replaces the deprecated
 * `package.json#prisma` block).
 *
 * Centralizes: schema location, migrations directory, and the seed command.
 * The seed command runs via `tsx` so TypeScript seed code executes without a
 * build step.
 */
export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: 'src/prisma/migrations',
    seed: 'tsx src/prisma/seed.ts',
  },
})
