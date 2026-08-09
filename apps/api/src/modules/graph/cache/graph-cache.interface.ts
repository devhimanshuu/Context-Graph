import type { EntityId } from '@contextgraph/types'
import type { GraphTraversalResult } from '../domain/traversal'

/**
 * Cache contract for traversal results. The engine and services depend on
 * this interface — never on a concrete cache — so Redis, memory, or a
 * distributed cache can be swapped in without touching engine code.
 *
 * Keys are scoped by (organization, workspace) so tenant isolation holds at
 * the cache boundary too; the caller supplies a per-query discriminator
 * (`cacheKey`) such as `entry:${nodeId}:${maxDepth}`.
 */
export abstract class IGraphCache {
  abstract getTraversal(
    organizationId: EntityId,
    workspaceId: EntityId,
    cacheKey: string,
  ): Promise<GraphTraversalResult | undefined>

  abstract setTraversal(
    organizationId: EntityId,
    workspaceId: EntityId,
    cacheKey: string,
    result: GraphTraversalResult,
    ttlMs?: number,
  ): Promise<void>

  /** Invalidates every cached traversal of a workspace (edge updates). */
  abstract invalidateWorkspace(organizationId: EntityId, workspaceId: EntityId): Promise<void>
}
