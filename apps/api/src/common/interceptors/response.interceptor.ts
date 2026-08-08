import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import type { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import type { ApiSuccessResponse } from '@contextgraph/shared'
import { getRequestId } from '../context/request-context'

/* Wraps every successful response in the platform envelope: */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        requestId: getRequestId(),
        timestamp: new Date().toISOString(),
      })),
    )
  }
}
