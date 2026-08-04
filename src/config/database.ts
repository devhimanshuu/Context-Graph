import 'server-only'
import { databaseSchema } from '@/validations/database'
// Import the error class directly (not the errors barrel) so validating
// database config never drags in `@prisma/client` via the error mapper.
import { DatabaseConfigurationError } from '@/lib/errors/database/database-configuration-error'

/**
 * Validated database configuration.
 *
 * Imported by any module that touches the data store (Prisma client,
 * repositories, seed). Fails fast with an actionable message when
 * `DATABASE_URL` is missing or malformed — the connection string is the one
 * thing you never want to discover is broken inside a query handler.
 *
 * NOTE: imports `server-only` — never import from client components.
 */
export interface DatabaseConfig {
  url: string
}

function load(): DatabaseConfig {
  const parsed = databaseSchema.safeParse(process.env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')

    throw new DatabaseConfigurationError(
      `Invalid database configuration. Set DATABASE_URL in .env (see .env.example):\n${details}`,
    )
  }

  return { url: parsed.data.DATABASE_URL }
}

export const databaseConfig: DatabaseConfig = load()
