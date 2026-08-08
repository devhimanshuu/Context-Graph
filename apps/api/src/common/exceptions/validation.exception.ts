import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from './app.exception'

export class ValidationException extends AppException {
  readonly code = ERROR_CODES.VALIDATION
  readonly statusCode = 400

  constructor(message = 'Validation failed', issues?: unknown) {
    super(message, issues)
  }
}
