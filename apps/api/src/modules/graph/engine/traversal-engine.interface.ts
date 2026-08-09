import type { Graph } from '../domain/graph'
import type { GraphTraversalRequest, GraphTraversalResult } from '../domain/traversal'

/**
 * Contract every traversal strategy implements. Engines are interchangeable:
 * BFS (unweighted, hop-ordered) and the weighted A-star/Dijkstra strategy
 * both accept the same `GraphTraversalRequest` and return the same
 * `GraphTraversalResult` shape (weighted runs additionally populate `costs`).
 *
 * Swap the strategy by binding a different provider — no calling code changes.
 */
export abstract class IGraphTraversalEngine {
  abstract traverse(graph: Graph, request: GraphTraversalRequest): GraphTraversalResult
  abstract assertSupportedDepth(maxDepth: number): void
}
