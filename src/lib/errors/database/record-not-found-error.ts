import { AppError } from '@/lib/errors/app-error'
import { ErrorCode } from '@/lib/errors/error-codes'

/**
 * Thrown by repositories when a record that was expected to exist does not.
 *
 * Maps to HTTP 404 and, unlike other database errors, is operational: a
 * missing row is an expected, client-relevant outcome.
 */
export class RecordNotFoundError extends AppError {
  constructor(entityType: string, id?: string | { [key: string]: unknown }, details?: unknown) {
    const subject = typeof id === 'string' ? `${entityType} (id: ${id})` : entityType
    super({
      code: ErrorCode.RECORD_NOT_FOUND,
      message: `${subject} was not found`,
      statusCode: 404,
      details,
    })
  }
}
