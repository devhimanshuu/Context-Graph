import {
  Injectable,
  Inject,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { type IMetricsLogger, METRICS_LOGGER } from '../interfaces/metrics-logger.interface'

/* Emits per-route request counters and latency timings through */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(@Inject(METRICS_LOGGER) private readonly metrics: IMetricsLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; route?: string }>()
    const route = context.getClass().name
    const startedAt = Date.now()

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics.increment('http_requests_total', { method: request.method, route })
          this.metrics.timing('http_request_duration_ms', Date.now() - startedAt, {
            method: request.method,
            route,
          })
        },
        error: () => {
          this.metrics.increment('http_errors_total', { method: request.method, route })
        },
      }),
    )
  }
}
