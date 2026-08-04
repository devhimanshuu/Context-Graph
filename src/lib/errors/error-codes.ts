/**
 * Canonical error codes.
 *
 * Codes are stable, machine-readable identifiers that clients can switch on.
 * They are intentionally domain-agnostic: domain-specific failures map to one
 * of these codes plus a `details` payload.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // --- Database layer (Phase 2) ---
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATABASE_CONFIGURATION_ERROR: 'DATABASE_CONFIGURATION_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
