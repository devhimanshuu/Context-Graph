import { z } from 'zod'
import { HEADERS } from '@contextgraph/shared'
import { ValidationException } from '../../common/exceptions/validation.exception'

/** Idempotency-Key format: 8–64 chars of [A-Za-z0-9._-]. */
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/)

/**
 * Parses the client `Idempotency-Key` header. Returns null when the header is
 * absent (no idempotency requested) and throws a 400 for malformed values —
 * malformed keys are rejected early rather than silently ignored.
 */
export function parseIdempotencyKey(raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  const result = idempotencyKeySchema.safeParse(raw)
  if (!result.success) {
    throw new ValidationException('Invalid Idempotency-Key header', {
      header: HEADERS.IDEMPOTENCY_KEY,
      format: '8–64 chars of [A-Za-z0-9._-]',
    })
  }
  return result.data
}
