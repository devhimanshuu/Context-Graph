import { ERROR_CODES, type ErrorCode } from '@contextgraph/shared'
import { AppException } from '../app.exception'

/* Base class for pipeline/engine failures. Each engine has a concrete */
export class PipelineException extends AppException {
  readonly code: ErrorCode = ERROR_CODES.PIPELINE
  readonly statusCode: number = 500

  constructor(message = 'Pipeline execution failed', details?: unknown) {
    super(message, details)
  }
}
