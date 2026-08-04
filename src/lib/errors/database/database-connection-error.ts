import { DatabaseError } from './database-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Thrown when the data store cannot be reached (Prisma P1000/P1001/P1002
 * family) or a pool/connection fails. Maps to HTTP 500; the operational
 * details are logged server-side only.
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message = 'Unable to reach the database', cause?: unknown) {
    super({
      code: ErrorCode.DATABASE_CONNECTION_ERROR,
      message,
      statusCode: 500,
      cause,
    })
  }
}
