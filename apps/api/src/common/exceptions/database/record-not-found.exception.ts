import { ERROR_CODES } from '@contextgraph/shared'
import { DatabaseException } from './database.exception'

export class RecordNotFoundException extends DatabaseException {
  override readonly code = ERROR_CODES.RECORD_NOT_FOUND
  override readonly statusCode = 404

  constructor(message = 'Record not found', details?: unknown) {
    super(message, details)
  }
}
