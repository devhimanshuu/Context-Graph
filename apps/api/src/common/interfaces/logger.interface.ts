/** Structured metadata attached to a log line. */
export type LogMeta = Record<string, unknown>

/* Application logging contract. Business code depends on ILogger, never on */
export interface ILogger {
  debug(message: string, meta?: LogMeta): void
  info(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  error(message: string, meta?: LogMeta, error?: unknown): void
}

/** DI token for the application logger. */
export const LOGGER = Symbol('ILogger')
