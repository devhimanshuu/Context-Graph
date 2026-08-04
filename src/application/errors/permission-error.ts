import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised when the caller lacks permission for a requested operation. This is
 * an *expected* outcome (403), so it is operational: the message and details
 * are safe to show to clients.
 */
export class PermissionError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({
      code: ErrorCode.PERMISSION_ERROR,
      message,
      statusCode: 403,
      isOperational: true,
      ...options,
    })
  }
}
