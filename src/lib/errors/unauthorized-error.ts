import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/** Thrown when the caller is not authenticated. Maps to HTTP 401. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required', details?: unknown) {
    super({ code: ErrorCode.UNAUTHORIZED, message, statusCode: 401, details })
  }
}
