import { PrismaClient } from '@prisma/client'
import { databaseConfig } from '@/config/database'
import { env } from '@/config/env'

// Node's global object is used to hold the client across hot reloads in
// development, preventing connection-pool exhaustion.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton.
 *
 * - One instance per process; cached on `globalThis` in development so HMR
 *   does not open new pools.
 * - `DATABASE_URL` is validated eagerly via `src/config/database.ts`, so a
 *   missing/malformed connection string fails at import time with a readable
 *   message instead of surfacing as an opaque error on the first query.
 * - Query logging follows the validated application environment, not ad-hoc
 *   `process.env` reads.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseConfig.url } },
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
