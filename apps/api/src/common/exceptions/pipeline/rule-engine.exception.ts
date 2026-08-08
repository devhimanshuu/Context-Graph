import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from './pipeline.exception'

export class RuleEngineException extends PipelineException {
  override readonly code = ERROR_CODES.RULE_ENGINE

  constructor(message = 'Rule evaluation failed', details?: unknown) {
    super(message, details)
  }
}
