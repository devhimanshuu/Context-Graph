import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import {
  CACHE_PROVIDER,
  type ICacheProvider,
} from '../../../common/interfaces/cache-provider.interface'
import type { GraphTraversalResult } from '../domain/traversal'
import { IGraphCache } from './graph-cache.interface'

const DEFAULT_TTL_MS = 60_000

/**
 * Default graph cache backed by the common in-memory cache provider.
 * Keys embed the tenant and workspace prefix, so entries are isolated per
 * organization. The memory backend tracks its own keys so workspace-scoped
 * invalidation works without a prefix scan; a Redis-backed implementation
 * can replace this binding later without touching the engine.
 */
@Injectable()
export class InMemoryGraphCache implements IGraphCache {
  /** Every key written through this cache, for workspace-scoped invalidation. */
  private readonly writtenKeys = new Set<string>()

  constructor(@Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider) {}

  async getTraversal(
    organizationId: EntityId,
    workspaceId: EntityId,
    cacheKey: string,
  ): Promise<GraphTraversalResult | undefined> {
    return this.cache.get<GraphTraversalResult>(this.key(organizationId, workspaceId, cacheKey))
  }

  async setTraversal(
    organizationId: EntityId,
    workspaceId: EntityId,
    cacheKey: string,
    result: GraphTraversalResult,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<void> {
    const key = this.key(organizationId, workspaceId, cacheKey)
    this.writtenKeys.add(key)
    await this.cache.set(key, result, ttlMs)
  }

  async invalidateWorkspace(organizationId: EntityId, workspaceId: EntityId): Promise<void> {
    const prefix = `graph:traversal:${organizationId}:${workspaceId}:`
    for (const key of this.writtenKeys) {
      if (key.startsWith(prefix)) {
        await this.cache.del(key)
        this.writtenKeys.delete(key)
      }
    }
  }

  private key(organizationId: EntityId, workspaceId: EntityId, cacheKey: string): string {
    return `graph:traversal:${organizationId}:${workspaceId}:${cacheKey}`
  }
}
