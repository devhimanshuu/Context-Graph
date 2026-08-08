import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from './app.exception'

export class ConflictException extends AppException {
  readonly code = ERROR_CODES.CONFLICT
  readonly statusCode = 409

  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, details)
  }
}
