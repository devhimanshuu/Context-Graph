import type { GraphNodeId } from '../domain/graph-node'
import type { Graph } from '../domain/graph'

/**
 * Cycle detection via Kahn's algorithm (iterative topological sort).
 *
 * Why Kahn's over DFS-with-recursion-state:
 * - Fully iterative — no call stack to overflow on 100k+ node graphs.
 * - O(V + E) with an index-based queue (no `Array.shift()` O(n) penalty).
 * - Produces a topological order as a side effect, which the validator and
 *   future ordering modules can reuse.
 *
 * Determinism: nodes are processed in lexicographic id order, and each walk
 * step picks the lexicographically smallest in-graph successor, so the
 * detected cycle is stable across runs.
 */
export class CycleDetector {
  /**
   * Returns the node ids forming one cycle, or an empty array when the graph
   * is acyclic. The cycle is reported as the path that closes back on itself.
   */
  findCycle(graph: Graph): readonly GraphNodeId[] {
    const inDegree = new Map<GraphNodeId, number>()
    for (const node of graph.getNodes()) {
      // In-degree over the upward adjacency (edges source -> target).
      inDegree.set(node.id, graph.childrenOf(node.id).length)
    }

    // Seed the queue with in-degree-0 nodes, sorted for deterministic output.
    const queue: GraphNodeId[] = [...inDegree.entries()]
      .filter(([, degree]) => degree === 0)
      .map(([id]) => id)
      .sort()
    let head = 0

    // Remove in-degree-0 nodes; nodes left over belong to (or hang off) a cycle.
    while (head < queue.length) {
      const id = queue[head]
      head += 1
      if (id === undefined) break // unreachable while head < length
      for (const edge of graph.parentsOf(id)) {
        const degree = inDegree.get(edge.targetId)
        if (degree === undefined) continue
        const next = degree - 1
        inDegree.set(edge.targetId, next)
        if (next === 0) {
          queue.push(edge.targetId)
        }
      }
    }

    const remaining = [...inDegree.entries()]
      .filter(([, degree]) => degree > 0)
      .map(([id]) => id)
      .sort()
    if (remaining.length === 0) return []

    return this.extractCycle(graph, remaining)
  }

  /**
   * Walks the subgraph induced by `remaining` until it closes a cycle.
   * A walk that dead-ends (no successor inside the remaining set) prunes its
   * own path — such nodes hang off a cycle but are not part of one — then a
   * fresh start node is tried. Every remaining node either is on a cycle or
   * leads to one, so this always terminates with a real cycle.
   */
  private extractCycle(graph: Graph, remaining: readonly GraphNodeId[]): readonly GraphNodeId[] {
    const inRemaining = new Set<GraphNodeId>(remaining)

    for (const start of remaining) {
      if (!inRemaining.has(start)) continue

      const path: GraphNodeId[] = []
      const seenAt = new Map<GraphNodeId, number>()
      let current: GraphNodeId | undefined = start

      while (current !== undefined && !seenAt.has(current)) {
        seenAt.set(current, path.length)
        path.push(current)
        // Deterministic successor: lexicographically smallest in-graph target.
        const next: GraphNodeId | undefined = graph
          .parentsOf(current)
          .map((edge) => edge.targetId)
          .filter((target) => inRemaining.has(target))
          .sort()[0]
        current = next
      }

      if (current === undefined) {
        // Dead end — this chain is an acyclic tail; prune it and keep looking.
        for (const id of path) inRemaining.delete(id)
        continue
      }

      const cycleStart = seenAt.get(current) ?? 0
      return path.slice(cycleStart)
    }

    return []
  }
}
