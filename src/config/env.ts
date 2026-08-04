import 'server-only'
import { envSchema, type Env } from '@/validations/env'

/**
 * Validated environment singleton.
 *
 * Parsed once at module load. If validation fails the process fails fast with
 * an actionable message instead of surfacing confusing runtime errors later.
 *
 * NOTE: this module imports `server-only` — it must never be imported from
 * client components or the browser bundle.
 */
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')

  throw new Error(`Invalid environment variables:\n${details}`)
}

export const env: Env = parsed.data
