import { Injectable } from '@nestjs/common'
import { InjectPinoLogger } from 'nestjs-pino'
import type { PinoLogger } from 'nestjs-pino'
import { ILogger, type LogMeta } from '../interfaces/logger.interface'

/* Pino implementation of ILogger (bound in CommonModule). */
@Injectable()
export class PinoLoggerService implements ILogger {
  constructor(@InjectPinoLogger() private readonly logger: PinoLogger) {}

  debug(message: string, meta?: LogMeta): void {
    this.logger.debug(meta ?? {}, message)
  }

  info(message: string, meta?: LogMeta): void {
    this.logger.info(meta ?? {}, message)
  }

  warn(message: string, meta?: LogMeta): void {
    this.logger.warn(meta ?? {}, message)
  }

  error(message: string, meta?: LogMeta, error?: unknown): void {
    this.logger.error(
      {
        ...meta,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      },
      message,
    )
  }
}
