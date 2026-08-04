import { z } from 'zod'

/**
 * Database environment contract.
 *
 * Kept separate from `src/validations/env.ts` because the database connection
 * is only *required* when database features are exercised (seed, migrations,
 * repositories). The application shell (dashboard, health check) must still
 * boot without a DATABASE_URL, so the app-wide schema keeps it optional while
 * `src/config/database.ts` enforces presence here at the point of use.
 *
 * Convention: document any new variable in `.env.example`.
 */
export const databaseSchema = z.object({
  /**
   * Supabase PostgreSQL connection string.
   * Use the transaction-mode pooler URL in production:
   *   postgresql://user:password@host:6543/db?pgbouncer=true&connection_limit=1
   */
  DATABASE_URL: z.url().refine((url) => url.startsWith('postgres'), {
    message: 'DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://)',
  }),
})

export type DatabaseEnv = z.infer<typeof databaseSchema>
