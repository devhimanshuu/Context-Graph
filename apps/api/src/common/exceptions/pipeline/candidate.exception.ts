import { ERROR_CODES, type ErrorCode } from '@contextgraph/shared'
import { PipelineException } from './pipeline.exception'

export class CandidateException extends PipelineException {
  override readonly code: ErrorCode = ERROR_CODES.CANDIDATE

  constructor(message = 'Candidate assembly failed', details?: unknown) {
    super(message, details)
  }
}
