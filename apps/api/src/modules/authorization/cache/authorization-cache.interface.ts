import type { EntityId } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'

/**
 * Cache contract for compiled authorization contexts. The engine never names a
 * concrete cache: swap in Redis, Upstash or a read replica later without
 * touching the compiler or evaluator. Invalidation is exposed per principal
 * and per tenant so future event-driven invalidation (role/clearance changes)
 * can drop exactly the affected entries.
 */
export interface IAuthorizationCache {
  get(userId: EntityId): Promise<CompiledAuthorizationContext | undefined>
  set(userId: EntityId, context: CompiledAuthorizationContext, ttlMs?: number): Promise<void>
  invalidate(userId: EntityId): Promise<void>
  invalidateOrganization(organizationId: EntityId): Promise<void>
  flush(): Promise<void>
}

/** DI token for the authorization cache. */
export const AUTHORIZATION_CACHE = Symbol('IAuthorizationCache')

/** Default TTL for compiled contexts (bounds staleness without events). */
export const DEFAULT_AUTHORIZATION_TTL_MS = 60_000
