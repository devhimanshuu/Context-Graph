import { ERROR_CODES, type ErrorCode } from '@contextgraph/shared'
import { AppException } from '../app.exception'

/* Base class for persistence failures. Concrete subclasses carry the right */
export class DatabaseException extends AppException {
  readonly code: ErrorCode = ERROR_CODES.INTERNAL
  readonly statusCode: number = 500

  constructor(message = 'Database operation failed', details?: unknown) {
    super(message, details)
  }
}
