import {
  TraversalDirection,
  type TraversalDirection as DirectionValue,
} from '../domain/graph-direction'
import type { Graph } from '../domain/graph'
import type { GraphNodeId } from '../domain/graph-node'
import { GraphTraversalError } from '../errors/graph-errors'

/** Depth bound shared by all traversal engines (protects against unbounded walks). */
export const MAX_SUPPORTED_DEPTH = 10_000

/** Validates a depth bound up front so callers get a clear error, not a hang. */
export function assertSupportedDepth(maxDepth: number): void {
  if (maxDepth < 0 || maxDepth > MAX_SUPPORTED_DEPTH) {
    throw new GraphTraversalError(
      `maxDepth must be between 0 and ${MAX_SUPPORTED_DEPTH}, got ${maxDepth}`,
    )
  }
}

/** A candidate next hop: the node id plus the edge weight used to reach it. */
export interface TraversalHop {
  readonly nextId: GraphNodeId
  readonly weight: number
}

/**
 * Returns the candidate next hops of a node. For UP traversal the hop is the
 * edge target (parent); for DOWN traversal the hop is the edge source
 * (child). Optional relationship-type filtering restricts which edges are
 * followed. Shared by every engine so expansion semantics stay identical.
 */
export function hopEdges(
  graph: Graph,
  id: GraphNodeId,
  direction: DirectionValue,
  relationshipTypes?: readonly string[],
): TraversalHop[] {
  const edges = direction === TraversalDirection.UP ? graph.parentsOf(id) : graph.childrenOf(id)
  const allowed =
    relationshipTypes === undefined || relationshipTypes.length === 0
      ? null
      : new Set<string>(relationshipTypes)

  const hops: TraversalHop[] = []
  for (const edge of edges) {
    if (allowed !== null && !allowed.has(edge.relationshipType)) continue
    hops.push({
      nextId: direction === TraversalDirection.UP ? edge.targetId : edge.sourceId,
      weight: edge.weight,
    })
  }
  return hops
}

/** Direct parents of a node in traversal terms, deduplicated and sorted. */
export function parentIdsOf(
  graph: Graph,
  id: GraphNodeId,
  direction: DirectionValue,
): readonly GraphNodeId[] {
  const edges = direction === TraversalDirection.UP ? graph.parentsOf(id) : graph.childrenOf(id)
  const ids = edges.map((edge) =>
    direction === TraversalDirection.UP ? edge.targetId : edge.sourceId,
  )
  return [...new Set(ids)].sort()
}
