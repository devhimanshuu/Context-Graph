import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised when a pipeline run fails outside of a specific stage — orchestration
 * failures, stage registration errors, or a stage crashing without a more
 * specific error. Always logged at `error`; the client sees a generic message.
 */
export class PipelineError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({ code: ErrorCode.PIPELINE_ERROR, message, statusCode: 500, ...options })
  }
}
