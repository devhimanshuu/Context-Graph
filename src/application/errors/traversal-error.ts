import { ErrorCode } from '@/lib/errors/error-codes'
import { BaseApplicationError } from './base-application-error'

/**
 * Raised by graph traversal implementations (BFS today, A* later) when the
 * traversal cannot complete — malformed graph state, missing entry nodes, or
 * limits exceeded. Non-operational: implementation details stay in logs.
 */
export class TraversalError extends BaseApplicationError {
  constructor(message: string, options?: { cause?: unknown; details?: unknown }) {
    super({ code: ErrorCode.TRAVERSAL_ERROR, message, statusCode: 500, ...options })
  }
}
