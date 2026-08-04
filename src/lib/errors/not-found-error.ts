import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/** Thrown when a requested resource does not exist. Maps to HTTP 404. */
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found', details?: unknown) {
    super({ code: ErrorCode.NOT_FOUND, message, statusCode: 404, details })
  }
}
