import { TraversalDirection, type TraversalDirection as DirectionValue } from './graph-direction'
import type { GraphEdge } from './graph-edge'
import type { GraphNode, GraphNodeId } from './graph-node'

/**
 * In-memory directed graph built from repository data.
 *
 * Direction contract (explicit, not inferred from the DB):
 * - `sourceId -> targetId` is the **child -> parent** hop by default, i.e.
 *   following an edge out of a node moves UP toward its ancestors.
 * - `parentsOf` exposes the upward adjacency; `childrenOf` exposes the reverse.
 *   Both are precomputed once at build time so traversal is O(1) per lookup.
 */
export class Graph {
  private readonly nodeById = new Map<GraphNodeId, GraphNode>()
  private readonly parentEdges = new Map<GraphNodeId, GraphEdge[]>()
  private readonly childEdges = new Map<GraphNodeId, GraphEdge[]>()

  constructor(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    direction: DirectionValue = TraversalDirection.UP,
  ) {
    for (const node of nodes) {
      this.nodeById.set(node.id, node)
      this.parentEdges.set(node.id, [])
      this.childEdges.set(node.id, [])
    }

    const append = (index: Map<GraphNodeId, GraphEdge[]>, key: GraphNodeId, edge: GraphEdge) => {
      const bucket = index.get(key)
      if (bucket !== undefined) bucket.push(edge)
    }

    for (const edge of edges) {
      // An edge whose endpoint is absent is a broken edge; keep it out of the
      // adjacency so traversal never walks into nothing. GraphValidator is the
      // authority that reports broken edges to callers.
      if (!this.nodeById.has(edge.sourceId) || !this.nodeById.has(edge.targetId)) continue
      if (direction === TraversalDirection.UP) {
        append(this.parentEdges, edge.sourceId, edge)
        append(this.childEdges, edge.targetId, edge)
      } else {
        append(this.parentEdges, edge.targetId, edge)
        append(this.childEdges, edge.sourceId, edge)
      }
    }
  }

  get nodeCount(): number {
    return this.nodeById.size
  }

  hasNode(id: GraphNodeId): boolean {
    return this.nodeById.has(id)
  }

  getNode(id: GraphNodeId): GraphNode | undefined {
    return this.nodeById.get(id)
  }

  getNodes(): GraphNode[] {
    return [...this.nodeById.values()]
  }

  /** Edges leaving `id` toward its parents (upward traversal). */
  parentsOf(id: GraphNodeId): readonly GraphEdge[] {
    return this.parentEdges.get(id) ?? []
  }

  /** Edges entering `id` from its children (downward traversal). */
  childrenOf(id: GraphNodeId): readonly GraphEdge[] {
    return this.childEdges.get(id) ?? []
  }
}
