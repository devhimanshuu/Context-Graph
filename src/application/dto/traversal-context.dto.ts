import { type RelationshipType } from '@/domain/enums'

/** One typed edge traversed during a graph walk. */
export interface TraversalEdgeDto {
  sourceId: string
  targetId: string
  relationshipType: RelationshipType
}

/**
 * The result of a graph traversal step: the nodes reached, the edges
 * traversed, and the frontier that was pruned (cycles, depth limits,
 * truncation) so callers can reason about completeness.
 */
export interface TraversalContextDto {
  visitedNodeIds: string[]
  edgesTraversed: TraversalEdgeDto[]
  /** Maximum depth reached (hops from the entry nodes). */
  depth: number
  /** Node ids that were reached but cut off by limits/pruning. */
  truncatedNodeIds: string[]
}
