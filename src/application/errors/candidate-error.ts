import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised by the candidate assembler when a candidate set cannot be built or
 * stored — empty inputs after filtering, ranking failures, or truncation
 * errors. Non-operational: internals stay in logs.
 */
export class CandidateError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({ code: ErrorCode.CANDIDATE_ERROR, message, statusCode: 500, ...options })
  }
}
