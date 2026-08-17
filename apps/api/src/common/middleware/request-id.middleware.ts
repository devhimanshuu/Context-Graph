import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { HEADERS } from '@contextgraph/shared'
import { requestContext } from '../context/request-context'
import { uuid } from '../utils/uuid'

/* Seeds per-request context: - requestId: assigned here (or honored from the inbound header) and echoed */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers[HEADERS.REQUEST_ID] as string | undefined) ?? uuid()
    const correlationId = (req.headers[HEADERS.CORRELATION_ID] as string | undefined) ?? uuid()

    // Echo into the request headers so transport logging (pino customProps)
    // carries the SAME id for generated and client-supplied values.
    req.headers[HEADERS.REQUEST_ID] = requestId
    req.headers[HEADERS.CORRELATION_ID] = correlationId

    res.setHeader(HEADERS.REQUEST_ID, requestId)
    res.setHeader(HEADERS.CORRELATION_ID, correlationId)

    requestContext.run({ requestId, correlationId, startedAt: Date.now() }, () => next())
  }
}
