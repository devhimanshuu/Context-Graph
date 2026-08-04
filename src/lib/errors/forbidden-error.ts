import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/** Thrown when the caller lacks permission for the operation. Maps to HTTP 403. */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details?: unknown) {
    super({ code: ErrorCode.FORBIDDEN, message, statusCode: 403, details })
  }
}
