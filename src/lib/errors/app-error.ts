import type { ErrorCode } from './error-codes'

export interface AppErrorOptions {
  code: ErrorCode
  message: string
  statusCode: number
  details?: unknown
  cause?: unknown
  /**
   * Explicit override of the operational flag (defaults to `statusCode < 500`).
   * Set by infrastructure error families (e.g. database errors) that must
   * never be treated as client-facing regardless of their status code.
   */
  isOperational?: boolean
}

/**
 * Base class for every error the application throws deliberately.
 *
 * Design notes:
 * - `code` is a stable machine-readable identifier (see `ErrorCode`).
 * - `statusCode` drives the HTTP status of the response.
 * - `details` carries structured, client-safe context (e.g. validation issues).
 * - `isOperational` distinguishes *expected* failures (4xx — safe to show to
 *   clients) from *programming/infrastructure* failures (5xx — must be logged
 *   in depth and never leak internals).
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly details: unknown
  readonly isOperational: boolean

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = new.target.name
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details
    this.isOperational = options.isOperational ?? options.statusCode < 500

    if (options.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
