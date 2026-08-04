import { AppError } from './app-error'
import { ErrorCode } from './error-codes'

/** Thrown when an operation conflicts with the current state. Maps to HTTP 409. */
export class ConflictError extends AppError {
  constructor(
    message = 'The request conflicts with the current state of the resource',
    details?: unknown,
  ) {
    super({ code: ErrorCode.CONFLICT, message, statusCode: 409, details })
  }
}
