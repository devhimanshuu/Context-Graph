import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from './app.exception'

export class UnauthorizedException extends AppException {
  readonly code = ERROR_CODES.UNAUTHORIZED
  readonly statusCode = 401

  constructor(message = 'Authentication required', details?: unknown) {
    super(message, details)
  }
}
