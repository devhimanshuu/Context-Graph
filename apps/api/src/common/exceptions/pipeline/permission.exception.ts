import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from './pipeline.exception'

export class PermissionException extends PipelineException {
  override readonly code = ERROR_CODES.PERMISSION
  override readonly statusCode = 403

  constructor(message = 'Permission evaluation failed', details?: unknown) {
    super(message, details)
  }
}
