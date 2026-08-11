import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from '../../../common/exceptions/pipeline/pipeline.exception'

/**
 * Invalid rule-engine configuration (unknown rule id, duplicate ids, unsafe
 * limits). A misconfigured engine must never run silently — fail fast.
 */
export class RuleEngineConfigurationException extends PipelineException {
  override readonly code = ERROR_CODES.RULE_ENGINE_CONFIG

  constructor(message = 'Rule engine configuration is invalid', details?: unknown) {
    super(message, details)
  }
}

/**
 * A rule threw an unexpected error during evaluation. Distinct from an
 * EXPECTED rule failure (a node that fails a rule is simply removed): system
 * errors are surfaced loudly and never swallowed — fail securely.
 */
export class RuleExecutionException extends PipelineException {
  override readonly code = ERROR_CODES.RULE_EXECUTION

  constructor(
    message = 'A rule failed during execution',
    details?: { ruleId?: string; cause?: unknown },
  ) {
    super(message, details)
  }
}

/** The input node set exceeded the configured safety bound. */
export class RuleEngineLimitException extends PipelineException {
  override readonly code = ERROR_CODES.RULE_ENGINE
  override readonly statusCode = 400

  constructor(message = 'Input node set exceeds the configured limit', details?: unknown) {
    super(message, details)
  }
}
