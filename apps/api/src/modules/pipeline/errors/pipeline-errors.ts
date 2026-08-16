import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from '../../../common/exceptions/pipeline/pipeline.exception'

/**
 * The request failed validation before any engine ran. Client-correctable,
 * therefore 400.
 */
export class PipelineValidationException extends PipelineException {
  override readonly code = ERROR_CODES.PIPELINE_VALIDATION
  override readonly statusCode = 400

  constructor(message = 'Pipeline request is invalid', details?: unknown) {
    super(message, details)
  }
}

/**
 * The caller's authorization context could not be built (e.g. the account no
 * longer exists). Fails closed — no candidate can be produced without a
 * trusted server-side context.
 */
export class PipelineAuthorizationException extends PipelineException {
  override readonly code = ERROR_CODES.PIPELINE_AUTHORIZATION
  override readonly statusCode = 403

  constructor(message = 'Pipeline authorization failed', details?: unknown) {
    super(message, details)
  }
}

/**
 * The entry node could not be resolved in the caller's workspace. Treated as
 * not-found (404) — existence of another tenant's node is never revealed.
 */
export class PipelineEntryResolutionException extends PipelineException {
  override readonly code = ERROR_CODES.PIPELINE_ENTRY
  override readonly statusCode = 404

  constructor(message = 'Entry node not found in workspace', details?: unknown) {
    super(message, details)
  }
}

/**
 * A stage exceeded the configured soft deadline. The run fails loudly —
 * a partially assembled package is never returned.
 */
export class PipelineTimeoutException extends PipelineException {
  override readonly code = ERROR_CODES.PIPELINE_TIMEOUT

  constructor(
    message = 'Pipeline stage exceeded its deadline',
    details?: { stageId?: string; timeoutMs?: number },
  ) {
    super(message, details)
  }
}

/**
 * The stored run finished without a package (failed execution) — it cannot
 * be reconstructed or formatted.
 */
export class PipelineRunNotCompletedException extends PipelineException {
  override readonly code = ERROR_CODES.PIPELINE
  override readonly statusCode = 409

  constructor(
    message = 'Pipeline run did not complete and has no package',
    details?: { requestId?: string; status?: string },
  ) {
    super(message, details)
  }
}
