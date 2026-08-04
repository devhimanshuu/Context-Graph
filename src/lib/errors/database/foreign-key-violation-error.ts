import { DatabaseError } from './database-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Thrown when an operation violates a foreign-key constraint
 * (Prisma P2003), e.g. referencing a source or target node that does not
 * exist. Maps to HTTP 409 Conflict.
 */
export class ForeignKeyViolationError extends DatabaseError {
  constructor(
    entityType: string,
    /** Constraint / field name that failed, when known. */
    constraint?: string,
    cause?: unknown,
  ) {
    super({
      code: ErrorCode.FOREIGN_KEY_VIOLATION,
      message: `The ${entityType} references a related record that does not exist${
        constraint ? ` (constraint: ${constraint})` : ''
      }`,
      statusCode: 409,
      details: constraint ? { constraint } : undefined,
      cause,
    })
  }
}
