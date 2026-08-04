import type { ZodError } from 'zod'
import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/**
 * Thrown when request data fails validation. Maps to HTTP 400.
 * `details.issues` is a flattened, client-safe list of field errors.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: ErrorCode.VALIDATION_ERROR, message, statusCode: 400, details })
  }

  /** Builds a ValidationError from a Zod parse failure. */
  static fromZodError(error: ZodError): ValidationError {
    return new ValidationError(
      'Validation failed',
      error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    )
  }
}
