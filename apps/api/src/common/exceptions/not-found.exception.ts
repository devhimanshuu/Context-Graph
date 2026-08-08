import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from './app.exception'

export class NotFoundException extends AppException {
  readonly code = ERROR_CODES.NOT_FOUND
  readonly statusCode = 404

  constructor(message = 'Resource not found', details?: unknown) {
    super(message, details)
  }
}
