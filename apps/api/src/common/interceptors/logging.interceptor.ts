import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Inject } from '@nestjs/common'
import { type ILogger, LOGGER } from '../interfaces/logger.interface'
import { getRequestId } from '../context/request-context'

/* Logs inbound method + path with the requestId so application logs can be */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>()

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug('Request handled', {
            method: request.method,
            path: request.url,
            requestId: getRequestId(),
          })
        },
        error: (error: unknown) => {
          this.logger.warn('Request failed', {
            method: request.method,
            path: request.url,
            requestId: getRequestId(),
            error: error instanceof Error ? error.message : String(error),
          })
        },
      }),
    )
  }
}
