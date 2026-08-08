import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

const EXECUTION_TIME_HEADER = 'x-execution-time-ms'

/* Measures how long the handler chain took and echoes it in a response */
@Injectable()
export class ExecutionTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now()
    const response = context
      .switchToHttp()
      .getResponse<{ setHeader: (name: string, value: string) => void }>()

    return next.handle().pipe(
      tap(() => {
        response.setHeader(EXECUTION_TIME_HEADER, String(Date.now() - startedAt))
      }),
    )
  }
}
