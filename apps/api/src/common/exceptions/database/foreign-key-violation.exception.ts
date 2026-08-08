import { ERROR_CODES } from '@contextgraph/shared'
import { DatabaseException } from './database.exception'

export class ForeignKeyViolationException extends DatabaseException {
  override readonly code = ERROR_CODES.FOREIGN_KEY_VIOLATION
  override readonly statusCode = 409

  constructor(message = 'Operation violates a foreign key constraint', details?: unknown) {
    super(message, details)
  }
}
