import type { ErrorCode } from '@/lib/errors'

/**
 * Standard API envelope.
 *
 * Every successful response looks like `{ success: true, data, meta }` and
 * every error response looks like `{ success: false, error }`. This uniform
 * contract keeps client-side handling simple and consistent across all
 * endpoints, and makes versioning/deprecation straightforward later.
 */

export interface ApiEnvelopeMeta {
  /** ISO-8601 timestamp of when the response was produced. */
  timestamp: string
  /** Correlation id; echoed back to clients for support/debugging. */
  requestId?: string
}

export interface ApiEnvelope<T> {
  success: true
  data: T
  meta: ApiEnvelopeMeta
}

export interface ApiEnvelopeError {
  code: ErrorCode
  message: string
  details?: unknown
  requestId?: string
}

export interface ApiErrorEnvelope {
  success: false
  error: ApiEnvelopeError
}
