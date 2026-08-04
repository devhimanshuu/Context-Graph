import type { GraphEdge } from '@/domain/models'
import type { RelationshipType } from '@/domain/enums'
import type { PageQuery, PageResult } from '@/types'
import type { CreateGraphEdgeSchema, UpdateGraphEdgeSchema } from '@/validations/graph-edge'
import type { BaseRepository } from '@/repositories/base'

/**
 * GraphEdge data-access contract.
 *
 * Adjacency methods are shaped for BFS/DFS traversal: outgoing edges from a
 * node (`findOutgoing`) and incoming edges into a node (`findIncoming`), each
 * optionally narrowed by relationship type. Implementations land with the
 * graph features (Phase 3).
 */
export interface GraphEdgeRepository extends BaseRepository<
  GraphEdge,
  string,
  CreateGraphEdgeSchema,
  UpdateGraphEdgeSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<GraphEdge>>

  findByWorkspace(workspaceId: string, params: PageQuery): Promise<PageResult<GraphEdge>>

  /** Edges out of `sourceId` (BFS expansion). */
  findOutgoing(
    workspaceId: string,
    sourceId: string,
    params?: PageQuery,
  ): Promise<PageResult<GraphEdge>>

  /** Edges into `targetId` (reverse traversal). */
  findIncoming(
    workspaceId: string,
    targetId: string,
    params?: PageQuery,
  ): Promise<PageResult<GraphEdge>>

  findByRelationshipType(
    workspaceId: string,
    relationshipType: RelationshipType,
    params: PageQuery,
  ): Promise<PageResult<GraphEdge>>

  /** Edges valid at `at` — temporal filtering for rules/context assembly. */
  findValidAt(workspaceId: string, at: Date, params: PageQuery): Promise<PageResult<GraphEdge>>

  findBySourceAndTarget(
    workspaceId: string,
    sourceId: string,
    targetId: string,
  ): Promise<GraphEdge | null>
}
