import { ERROR_CODES } from '@contextgraph/shared'
import { DatabaseException } from './database.exception'

export class DatabaseConnectionException extends DatabaseException {
  override readonly code = ERROR_CODES.DATABASE_CONNECTION
  override readonly statusCode = 503

  constructor(message = 'Database connection failed', details?: unknown) {
    super(message, details)
  }
}
