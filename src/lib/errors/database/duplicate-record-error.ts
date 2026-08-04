import { DatabaseError } from './database-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Thrown when an insert/update violates a uniqueness constraint
 * (Prisma P2002). Maps to HTTP 409 Conflict.
 */
export class DuplicateRecordError extends DatabaseError {
  constructor(
    entityType: string,
    /** Field(s) that collided, e.g. `{ email: 'a@b.com' }`. */
    fields: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: ErrorCode.DUPLICATE_RECORD,
      message: `A ${entityType} with the same ${Object.keys(fields).join(', ')} already exists`,
      statusCode: 409,
      details: { fields },
      cause,
    })
  }
}
