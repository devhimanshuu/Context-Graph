import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/**
 * Thrown for unexpected failures. Maps to HTTP 500.
 * Non-operational: the full error is logged server-side, while clients only
 * receive the generic message (internals never leak across the boundary).
 */
export class InternalServerError extends AppError {
  constructor(
    message = 'An internal server error occurred',
    options?: { details?: unknown; cause?: unknown },
  ) {
    super({
      code: ErrorCode.INTERNAL_ERROR,
      message,
      statusCode: 500,
      details: options?.details,
      cause: options?.cause,
    })
  }
}
