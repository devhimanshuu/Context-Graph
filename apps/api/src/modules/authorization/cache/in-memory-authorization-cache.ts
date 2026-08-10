import { Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import {
  AUTHORIZATION_CACHE,
  DEFAULT_AUTHORIZATION_TTL_MS,
  type IAuthorizationCache,
} from './authorization-cache.interface'

interface CacheEntry {
  context: CompiledAuthorizationContext
  expiresAt: number
}

/** Simple TTL map. Keys track their tenant so `invalidateOrganization` can drop a whole tenant's contexts. */
@Injectable()
export class InMemoryAuthorizationCache implements IAuthorizationCache {
  private readonly entries = new Map<EntityId, CacheEntry>()
  private readonly tenantOf = new Map<EntityId, EntityId>()

  async get(userId: EntityId): Promise<CompiledAuthorizationContext | undefined> {
    const entry = this.entries.get(userId)
    if (entry === undefined) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(userId)
      this.tenantOf.delete(userId)
      return undefined
    }
    return entry.context
  }

  async set(
    userId: EntityId,
    context: CompiledAuthorizationContext,
    ttlMs?: number,
  ): Promise<void> {
    const ttl = ttlMs ?? DEFAULT_AUTHORIZATION_TTL_MS
    this.entries.set(userId, { context, expiresAt: Date.now() + ttl })
    this.tenantOf.set(userId, context.organizationId)
  }

  async invalidate(userId: EntityId): Promise<void> {
    this.entries.delete(userId)
    this.tenantOf.delete(userId)
  }

  async invalidateOrganization(organizationId: EntityId): Promise<void> {
    for (const [userId, tenant] of this.tenantOf) {
      if (tenant === organizationId) {
        this.entries.delete(userId)
        this.tenantOf.delete(userId)
      }
    }
  }

  async flush(): Promise<void> {
    this.entries.clear()
    this.tenantOf.clear()
  }
}

/** Provider token binding (exported for module registration). */
export const AUTHORIZATION_CACHE_PROVIDER = {
  provide: AUTHORIZATION_CACHE,
  useClass: InMemoryAuthorizationCache,
}
