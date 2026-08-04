/**
 * Logger contract.
 *
 * Business logic depends only on this interface — never on a concrete
 * implementation. Swapping `ConsoleLogger` for Pino, Winston, Datadog or
 * Sentry later requires changing only the factory in `index.ts`.
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

/** Structured key-value context attached to a log entry. */
export interface LogContext {
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void

  /**
   * Returns a logger that always attaches `context` (e.g. `{ logger: "x" }`
   * or `{ requestId }`) to every entry it emits.
   */
  child(context: LogContext): Logger
}
