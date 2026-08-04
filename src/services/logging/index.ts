import { env } from '@/config/env'
import { ConsoleLogger } from './console-logger'
import type { Logger } from './types'

/**
 * Logger factory.
 *
 * This is the ONLY place that knows which concrete Logger implementation is
 * used. To migrate to Pino/Winston/Datadog/Sentry, swap the implementation
 * here — no other module changes (see `README.md` in this folder).
 */
export function getLogger(name?: string): Logger {
  return new ConsoleLogger(env.LOG_LEVEL, name)
}

/** Shared application-wide logger. */
export const logger: Logger = getLogger()

export type { LogContext, LogLevel, Logger } from './types'
