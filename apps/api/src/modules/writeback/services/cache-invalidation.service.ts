/* Cache Invalidation Service — coordinates cache invalidation across all layers.

When a proposal is published (new knowledge node + graph edges), multiple
caches become stale:

  1. Graph Cache — traversal results are now incomplete (new nodes/edges)
  2. Retrieval Cache — context resolution results may now include new knowledge
  3. Rule Cache — rule evaluation may be affected by new knowledge nodes

This service coordinates invalidation across all layers. Each invalidation
is independent and failure-tolerant — a failed cache invalidation should
never block the proposal flow. The cache will naturally expire via TTL.

Architecture principle: the cache invalidation service is a convenience
coordinator. Individual caches are still responsible for their own
consistency guarantees. This service ensures that when knowledge changes,
all relevant caches are notified. */

import { Inject, Injectable, Logger } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IGraphCache } from '../../graph/cache/graph-cache.interface'

/** Token for the retrieval cache — optional dependency. */
export const RETRIEVAL_CACHE_INVALIDATOR = Symbol('RetrievalCacheInvalidator')

export interface IRetrievalCacheInvalidator {
  invalidateByOrganization(organizationId: EntityId): Promise<void>
}

/** Token for the rule cache — optional dependency. */
export const RULE_CACHE_INVALIDATOR = Symbol('RuleCacheInvalidator')

export interface IRuleCacheInvalidator {
  invalidateAll(): Promise<void>
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name)

  constructor(
    @Inject(IGraphCache) private readonly graphCache: IGraphCache,
    @Inject(RETRIEVAL_CACHE_INVALIDATOR)
    private readonly retrievalCache: IRetrievalCacheInvalidator | null,
    @Inject(RULE_CACHE_INVALIDATOR)
    private readonly ruleCache: IRuleCacheInvalidator | null,
  ) {}

  /**
   * Invalidate all caches affected by a published knowledge node.
   * Each invalidation is independent — failures are logged but don't propagate.
   */
  async invalidateOnPublish(organizationId: EntityId, workspaceId: EntityId): Promise<void> {
    const startTime = performance.now()

    // 1. Invalidate graph traversal cache (new nodes/edges affect BFS results)
    await this.safeInvalidate('graph', () =>
      this.graphCache.invalidateWorkspace(organizationId, workspaceId),
    )

    // 2. Invalidate retrieval cache (new knowledge available for context resolution)
    await this.safeInvalidate(
      'retrieval',
      () => this.retrievalCache?.invalidateByOrganization(organizationId) ?? Promise.resolve(),
    )

    // 3. Invalidate rule cache (new nodes may affect rule evaluation)
    await this.safeInvalidate('rule', () => this.ruleCache?.invalidateAll() ?? Promise.resolve())

    const durationMs = Math.round(performance.now() - startTime)
    this.logger.debug('Cache invalidation complete', {
      organizationId,
      workspaceId,
      durationMs,
    })
  }

  /**
   * Safely execute a cache invalidation, logging errors without propagating.
   * Cache invalidation failure should NEVER block the proposal flow.
   */
  private async safeInvalidate(cacheName: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (error) {
      this.logger.warn(`${cacheName} cache invalidation failed (non-blocking)`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
