import type { ErrorCode } from '@contextgraph/shared'

/* Base class for every business/domain exception. Carries a stable machine-readable `code` (API contract) and an HTTP */
export abstract class AppException extends Error {
  abstract readonly code: ErrorCode
  abstract readonly statusCode: number

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = new.target.name
  }
}
