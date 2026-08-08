import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from './pipeline.exception'

export class TraversalException extends PipelineException {
  override readonly code = ERROR_CODES.TRAVERSAL

  constructor(message = 'Graph traversal failed', details?: unknown) {
    super(message, details)
  }
}
