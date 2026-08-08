import { ERROR_CODES } from '@contextgraph/shared'
import { DatabaseException } from './database.exception'

export class UniqueViolationException extends DatabaseException {
  override readonly code = ERROR_CODES.UNIQUE_VIOLATION
  override readonly statusCode = 409

  constructor(message = 'A record with the same unique value already exists', details?: unknown) {
    super(message, details)
  }
}
