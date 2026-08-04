import { Prisma } from '@prisma/client'
import { AppError } from '@/lib/errors/app-error'
import { DatabaseConnectionError } from './database-connection-error'
import { DuplicateRecordError } from './duplicate-record-error'
import { ForeignKeyViolationError } from './foreign-key-violation-error'
import { RecordNotFoundError } from './record-not-found-error'
import { DatabaseError } from './database-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Maps Prisma runtime errors to the application error family.
 *
 * Repositories wrap their calls with `mapPrismaError` so Prisma's
 * vendor-specific error vocabulary never leaks past the data-access layer —
 * services and controllers only ever see `AppError` instances.
 *
 * Referenced codes (Prisma 6):
 * - P1000..P1002  connection failures        → DatabaseConnectionError
 * - P2002         unique constraint          → DuplicateRecordError
 * - P2003         foreign key constraint     → ForeignKeyViolationError
 * - P2025         record not found           → RecordNotFoundError
 *
 * Unknown/unsupported errors are returned as a generic DatabaseError so the
 * caller still gets a typed, loggable failure.
 */
export function mapPrismaError(error: unknown, entityType = 'record'): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return new DatabaseError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected database error occurred',
      statusCode: 500,
      cause: error,
    })
  }

  switch (error.code) {
    case 'P1000':
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
      return new DatabaseConnectionError(
        `Database connection failed (${error.code}): ${error.message}`,
        error,
      )
    case 'P2002': {
      const target = extractTarget(error)
      return new DuplicateRecordError(entityType, target, error)
    }
    case 'P2003': {
      const constraint = extractTarget(error).toString()
      return new ForeignKeyViolationError(entityType, constraint, error)
    }
    case 'P2025':
      return new RecordNotFoundError(entityType, undefined, error.meta)
    default:
      return new DatabaseError({
        code: ErrorCode.INTERNAL_ERROR,
        message: `Database error (${error.code})`,
        statusCode: 500,
        details: { code: error.code },
        cause: error,
      })
  }
}

/** Prisma reports the violating field/constraint in `meta.target`. */
function extractTarget(error: Prisma.PrismaClientKnownRequestError): Record<string, unknown> {
  const target = error.meta?.target
  if (Array.isArray(target)) {
    return Object.fromEntries(target.map((field) => [String(field), 'conflict']))
  }
  if (typeof target === 'string') {
    return { [target]: 'conflict' }
  }
  return { unknown: 'conflict' }
}
