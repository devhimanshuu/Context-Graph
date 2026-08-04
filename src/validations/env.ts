import { z } from 'zod'

/**
 * The single source of truth for the application's environment contract.
 *
 * Every environment variable the application understands is declared here.
 * The schema is parsed once at module load in `src/config/env.ts`; a boot
 * failure with a readable message is thrown if any variable is missing or
 * invalid, so misconfiguration is caught in CI/deployment — not at runtime.
 *
 * Convention: add new variables here, then document them in `.env.example`.
 */
export const envSchema = z.object({
  /** Node environment. Never trust `NODE_ENV` defaults from tooling. */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Public base URL of the deployed application. */
  APP_URL: z.url().default('http://localhost:3000'),

  /** Minimum log level for the application logger. */
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  /**
   * Supabase PostgreSQL connection string.
   * Optional in Phase 1 (no data models yet); becomes required in Phase 2
   * when repositories start reading/writing.
   */
  DATABASE_URL: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>
