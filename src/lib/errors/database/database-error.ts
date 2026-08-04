import { AppError } from '@/lib/errors/app-error'
import type { AppErrorOptions } from '@/lib/errors/app-error'

/**
 * Base class for database-layer errors.
 *
 * Extends the shared `AppError` family so the HTTP boundary (error handler)
 * and the logging system treat database failures exactly like every other
 * failure — no special-casing at the edges.
 *
 * All database errors are non-operational by default (they are infrastructure
 * failures, logged at `error` severity and never leaked to clients verbatim);
 * only `RecordNotFoundError` overrides that because a missing row is an
 * expected, client-relevant outcome (404).
 */
export class DatabaseError extends AppError {
  constructor(options: AppErrorOptions) {
    // Database failures are infrastructure errors: never operational, never
    // shown to clients verbatim. `AppError` derives `isOperational` from the
    // status code; force the flag off regardless.
    super({ ...options, isOperational: false })
  }
}
