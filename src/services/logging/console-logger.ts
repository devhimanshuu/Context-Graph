import type { LogContext, LogLevel, Logger } from './types'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

/**
 * Console-backed Logger implementation.
 *
 * Emits one JSON line per entry so output is parseable by any log pipeline
 * (Datadog, CloudWatch, ...) from day one. Entries below `minLevel` are
 * dropped, mirroring what a real logging library would do.
 */
export class ConsoleLogger implements Logger {
  constructor(
    private readonly minLevel: LogLevel,
    private readonly name?: string,
    private readonly baseContext: LogContext = {},
  ) {}

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context)
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(this.minLevel, this.name, { ...this.baseContext, ...context })
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) {
      return
    }

    const entry = JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      logger: this.name,
      message,
      ...this.baseContext,
      ...context,
    })

    switch (level) {
      case 'debug':
        console.debug(entry)
        break
      case 'info':
        console.info(entry)
        break
      case 'warn':
        console.warn(entry)
        break
      case 'error':
        console.error(entry)
        break
    }
  }
}
