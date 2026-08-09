import type { RelationshipType } from '@contextgraph/types'
import type { TraversalDirection as DirectionValue } from './graph-direction'
import type { GraphNodeId } from './graph-node'

/** Traversal strategy selectable by callers. */
export const TraversalStrategy = {
  /** Breadth-first search — expands by hop level, ignores edge weights. */
  BFS: 'bfs',
  /** Weighted strategy — expands by accumulated edge weight (A-star / Dijkstra). */
  WEIGHTED: 'weighted',
} as const

export type TraversalStrategy = (typeof TraversalStrategy)[keyof typeof TraversalStrategy]

/** Input contract of a graph traversal. */
export interface GraphTraversalRequest {
  /** Node the traversal starts from (cost/distance 0). */
  readonly entryNodeId: GraphNodeId
  /**
   * Maximum number of hops from the entry node. 1 = direct parents only.
   * Bounded so a misconfigured graph can never cause an unbounded walk.
   */
  readonly maxDepth: number
  /** When set, only edges with one of these relationship types are followed. */
  readonly relationshipTypes?: readonly RelationshipType[]
  /** Traversal direction. Defaults to UP (toward ancestors). */
  readonly direction?: DirectionValue
}

/**
 * A single node reached during traversal, with its traversal metadata.
 *
 * `distance` is always the hop count from the entry along the traversed path.
 * `cost` is populated only by weighted engines: the accumulated edge weight
 * of the path that reached the node (see `GraphTraversalResult.costs`).
 */
export interface TraversalNode {
  readonly id: GraphNodeId
  /** Hop distance from the entry node along the traversed path (entry = 0). */
  readonly distance: number
  /** Accumulated edge weight of the traversed path (weighted engines only). */
  readonly cost?: number
  /** Discovery order index (0 = entry node). Deterministic. */
  readonly order: number
  /** Direct parents of this node in the graph (one hop toward the root). */
  readonly parentIds: readonly GraphNodeId[]
}

/** Raw counters collected during one traversal run. */
export interface GraphTraversalMetadata {
  /** Number of unique nodes visited. */
  readonly visitedNodeCount: number
  /** Deepest distance level reached (0 for a single-node graph). */
  readonly traversalDepth: number
  /** Number of edges followed (examined as candidate hops). */
  readonly edgesExamined: number
  /** Number of times an already-visited node was skipped. */
  readonly duplicateVisitsPrevented: number
  /** Peak size of the traversal frontier (queue / priority queue). */
  readonly maxQueueSize: number
  /** Wall-clock duration of the traversal in milliseconds. */
  readonly traversalDurationMs: number
}

/** Result of a traversal run. */
export interface GraphTraversalResult {
  readonly entryNodeId: GraphNodeId
  /** Every unique visited node, in deterministic traversal order. */
  readonly nodes: readonly TraversalNode[]
  /** Traversal order of each node id (mirrors `nodes`, indexed for O(1) lookup). */
  readonly order: ReadonlyMap<GraphNodeId, number>
  /** Hop distance of each visited node from the entry node. */
  readonly distances: ReadonlyMap<GraphNodeId, number>
  /**
   * Accumulated edge weight per visited node (weighted engines only). For the
   * weighted strategy, `distance` and `cost` describe the SAME path — the
   * lowest-cost one — so the hop count may exceed the graph's minimum.
   */
  readonly costs?: ReadonlyMap<GraphNodeId, number>
  /** If `true`, the traversal hit `maxDepth` and was truncated. */
  readonly truncated: boolean
  readonly metadata: GraphTraversalMetadata
}
