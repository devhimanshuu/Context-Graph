import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from './app.exception'

export class ForbiddenException extends AppException {
  readonly code = ERROR_CODES.FORBIDDEN
  readonly statusCode = 403

  constructor(message = 'Access denied', details?: unknown) {
    super(message, details)
  }
}
