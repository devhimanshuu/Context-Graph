import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { HEADERS } from '@contextgraph/shared'
import { uuid } from '../utils/uuid'

/* Ensures every response carries a correlation id, even when the request-id */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (res.getHeader(HEADERS.CORRELATION_ID) === undefined) {
      res.setHeader(
        HEADERS.CORRELATION_ID,
        (req.headers[HEADERS.CORRELATION_ID] as string) ?? uuid(),
      )
    }
    next()
  }
}
