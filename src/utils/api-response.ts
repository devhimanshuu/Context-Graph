import { NextResponse } from 'next/server'
import type { ApiEnvelope, ApiEnvelopeMeta, ApiErrorEnvelope } from '@/dto/api-response.dto'
import type { ErrorCode } from '@/lib/errors'

/**
 * Response helpers for route handlers.
 *
 * All route handlers return responses through these helpers so the envelope
 * shape, timestamps and content-type stay consistent across the entire API.
 */

export interface ResponseOptions {
  requestId?: string
}

function buildMeta(options?: ResponseOptions): ApiEnvelopeMeta {
  return { timestamp: new Date().toISOString(), ...options }
}

/** 200 — successful response with a payload. */
export function ok<T>(data: T, options?: ResponseOptions): NextResponse {
  const envelope: ApiEnvelope<T> = { success: true, data, meta: buildMeta(options) }
  return NextResponse.json(envelope)
}

/** 201 — resource created. */
export function created<T>(data: T, options?: ResponseOptions): NextResponse {
  const envelope: ApiEnvelope<T> = { success: true, data, meta: buildMeta(options) }
  return NextResponse.json(envelope, { status: 201 })
}

/** 204 — success with no content. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/** Builds the standard error envelope (used by the shared error handler). */
export function errorEnvelope(
  error: { code: ErrorCode; message: string; details?: unknown },
  requestId?: string,
): ApiErrorEnvelope {
  return { success: false, error: { ...error, requestId } }
}
