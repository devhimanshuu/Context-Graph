import { ZodError } from 'zod'
import { AppError } from './app-error'
import { InternalServerError } from './internal-server-error'
import { ValidationError } from './validation-error'

/** Type guard that narrows an unknown value to an `AppError`. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Normalizes any thrown value into an `AppError`.
 *
 * - `AppError` instances pass through unchanged.
 * - Zod validation failures become a client-safe 400 `ValidationError`.
 * - Everything else (plain Errors, thrown strings, ...) becomes a
 *   non-operational `InternalServerError` with the original error attached as
 *   `cause` for server-side logging.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof ZodError) {
    return ValidationError.fromZodError(error)
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, { cause: error })
  }

  return new InternalServerError('An unexpected error occurred', { cause: error })
}
