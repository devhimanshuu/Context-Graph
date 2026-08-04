import { AppError } from '@/lib/errors/app-error'
import { type AppErrorOptions } from '@/lib/errors/app-error'

/**
 * Base class for application-layer (Phase 3) errors.
 *
 * Extends the shared `AppError` family so the HTTP boundary and logging system
 * treat application failures exactly like every other failure — no special
 * casing at the edges.
 *
 * Application failures are **non-operational by default** (they indicate a
 * bug or an infrastructure problem and must never leak internals to clients).
 * Errors that represent an *expected* outcome for the caller (e.g.
 * `PermissionError` → 403) override `isOperational` explicitly.
 */
export class BaseApplicationError extends AppError {
  constructor(options: AppErrorOptions) {
    super({ isOperational: false, ...options })
  }
}
