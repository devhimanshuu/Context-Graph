import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised when application-layer configuration (pipeline, traversal, permission,
 * cache, metrics) is missing, malformed, or out of range. The container also
 * raises this when a service token has no registered provider.
 */
export class ConfigurationError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({ code: ErrorCode.APPLICATION_CONFIGURATION_ERROR, message, statusCode: 500, ...options })
  }
}
