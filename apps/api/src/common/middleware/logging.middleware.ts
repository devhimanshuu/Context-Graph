import { Inject, Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { type ILogger, LOGGER } from '../interfaces/logger.interface'
import { getRequestId } from '../context/request-context'

/* Logs request starts through ILogger with the requestId, so application */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    this.logger.debug('Request started', {
      method: req.method,
      path: req.url,
      requestId: getRequestId(),
    })
    next()
  }
}
