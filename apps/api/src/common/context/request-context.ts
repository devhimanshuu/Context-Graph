import { AsyncLocalStorage } from 'node:async_hooks'
import type { AuthenticatedUser } from '@contextgraph/types'

/* Per-request context propagated through the whole request lifetime. */
export interface RequestContextData {
  requestId: string
  correlationId: string
  startedAt: number
  user?: AuthenticatedUser
}

export const requestContext = new AsyncLocalStorage<RequestContextData>()

export function getRequestContext(): RequestContextData | undefined {
  return requestContext.getStore()
}

export function getRequestId(): string {
  return getRequestContext()?.requestId ?? 'unknown'
}

export function getCorrelationId(): string {
  return getRequestContext()?.correlationId ?? 'unknown'
}
