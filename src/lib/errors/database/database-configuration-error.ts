import { DatabaseError } from './database-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Thrown when database configuration is invalid (missing/malformed
 * DATABASE_URL). Maps to HTTP 500. Raised eagerly by `src/config/database.ts`
 * so misconfiguration fails fast with an actionable message.
 */
export class DatabaseConfigurationError extends DatabaseError {
  constructor(message = 'Invalid database configuration', cause?: unknown) {
    super({
      code: ErrorCode.DATABASE_CONFIGURATION_ERROR,
      message,
      statusCode: 500,
      cause,
    })
  }
}
