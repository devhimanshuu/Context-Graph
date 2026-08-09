import type { EntityId, RelationshipType } from '@contextgraph/types'

/**
 * In-memory edge of a domain graph.
 *
 * `sourceId` and `targetId` mirror the persistence layer (a `GraphEdge` row).
 * Direction semantics are NOT inferred from those names — see
 * `TraversalDirection` and the `Graph` adjacency views. The engine traverses
 * the explicit adjacency the builder constructs, never raw edge rows.
 */
export interface GraphEdge {
  readonly id: EntityId
  readonly sourceId: EntityId
  readonly targetId: EntityId
  readonly relationshipType: RelationshipType
  /** Traversal weight (0-1); reserved for weighted traversal strategies. */
  readonly weight: number
}
