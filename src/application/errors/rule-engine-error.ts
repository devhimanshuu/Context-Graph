import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised by the deterministic rule engine when a rule cannot be evaluated —
 * malformed condition trees, evaluation timeouts, or unsupported operators.
 * Non-operational: internals stay in logs.
 */
export class RuleEngineError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({ code: ErrorCode.RULE_ENGINE_ERROR, message, statusCode: 500, ...options })
  }
}
