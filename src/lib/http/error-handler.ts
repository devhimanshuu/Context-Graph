import { NextResponse } from 'next/server'
import { toAppError } from '@/lib/errors'
import { logger } from '@/services/logging'
import { errorEnvelope } from '@/utils/api-response'

export interface ErrorHandlerOptions {
  requestId?: string
}

/**
 * Centralized error handler for route handlers.
 *
 * Every route handler should delegate unknown errors here. Responsibilities:
 * - normalize any thrown value into an `AppError`
 * - log with the right severity (expected 4xx → warn, unexpected 5xx → error)
 * - return the standard error envelope with the correct status code
 *
 * Client-facing messages never leak internals: non-operational errors return
 * the generic message while full details go to the server logs.
 */
export function handleRouteError(error: unknown, options: ErrorHandlerOptions = {}): NextResponse {
  const appError = toAppError(error)
  const { requestId } = options

  if (appError.isOperational) {
    logger.warn('Request failed', {
      code: appError.code,
      statusCode: appError.statusCode,
      message: appError.message,
      requestId,
    })
  } else {
    logger.error('Unhandled error', {
      code: appError.code,
      statusCode: appError.statusCode,
      error: appError,
      requestId,
    })
  }

  // Never leak internals: non-operational (5xx) failures return a generic
  // message and no details; the real message/details live in the server log
  // above. Operational (4xx) errors are safe to surface as-is.
  const clientMessage = appError.isOperational
    ? appError.message
    : 'An internal server error occurred'
  const clientDetails = appError.isOperational ? appError.details : undefined

  const envelope = errorEnvelope(
    { code: appError.code, message: clientMessage, details: clientDetails },
    requestId,
  )

  return NextResponse.json(envelope, { status: appError.statusCode })
}
