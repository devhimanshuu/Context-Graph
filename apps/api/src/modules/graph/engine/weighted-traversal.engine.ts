import { Injectable } from '@nestjs/common'
import { TraversalDirection } from '../domain/graph-direction'
import type { Graph } from '../domain/graph'
import type { GraphNodeId } from '../domain/graph-node'
import type {
  GraphTraversalMetadata,
  GraphTraversalRequest,
  GraphTraversalResult,
  TraversalNode,
} from '../domain/traversal'
import { GraphNodeNotFoundError, GraphTraversalError } from '../errors/graph-errors'
import type { IGraphTraversalEngine } from './traversal-engine.interface'
import { assertSupportedDepth, hopEdges, parentIdsOf } from './traversal-hops'
import { MinPriorityQueue } from './priority-queue'

/**
 * Heuristic used by A*. Must be admissible (never overestimate the remaining
 * cost) and consistent for optimality. The default zero heuristic reduces the
 * algorithm to uniform-cost search (Dijkstra), which is optimal for the
 * non-negative edge weights the platform stores. A domain heuristic (e.g. an
 * importance-based estimate) can be injected later without engine changes.
 */
export type Heuristic = (nodeId: GraphNodeId, graph: Graph) => number

interface QueueEntry {
  /** Accumulated cost (f = g + h) used for expansion order. */
  readonly cost: number
  /** Hop count along the traversed path. */
  readonly hops: number
  readonly nodeId: GraphNodeId
}

/**
 * Weighted traversal (A* / Dijkstra). Implements the same request/result
 * contracts as BFS so the strategies are interchangeable — edge weights now
 * influence expansion order: the frontier is a priority queue ordered by
 * accumulated cost (tie-broken lexicographically by node id for determinism).
 *
 * Properties:
 * - Optimal: pops nodes in non-decreasing cost order, so the first time a
 *   node is finalized it has its minimum accumulated cost (weights ≥ 0).
 * - O((V + E) log V): binary-heap priority queue, each node finalized once.
 * - `costs` and `distance` describe the SAME (lowest-cost) path — `distance`
 *   is the hop count of that path, which may exceed the graph's minimum hops.
 * - No recursion: safe for 100k+ node graphs.
 */
@Injectable()
export class WeightedTraversalEngine implements IGraphTraversalEngine {
  constructor(private readonly heuristic: Heuristic = () => 0) {}

  traverse(graph: Graph, request: GraphTraversalRequest): GraphTraversalResult {
    if (!graph.hasNode(request.entryNodeId)) {
      throw new GraphNodeNotFoundError(request.entryNodeId)
    }

    const startedAt = performance.now()
    const visited = new Set<GraphNodeId>()
    const distances = new Map<GraphNodeId, number>()
    const costs = new Map<GraphNodeId, number>()
    const order = new Map<GraphNodeId, number>()
    const discovered: GraphNodeId[] = []

    let edgesExamined = 0
    let duplicateVisitsPrevented = 0
    let traversalDepth = 0
    let maxQueueSize = 1
    let truncated = false

    const direction = request.direction ?? TraversalDirection.UP
    const queue = new MinPriorityQueue<QueueEntry>((a, b) =>
      a.cost !== b.cost ? a.cost - b.cost : a.nodeId.localeCompare(b.nodeId),
    )
    queue.push({ cost: 0, hops: 0, nodeId: request.entryNodeId })

    try {
      while (queue.size > 0) {
        const entry = queue.pop()
        if (entry === undefined) break

        // Stale entry: this node was already finalized with a lower cost.
        if (visited.has(entry.nodeId)) {
          duplicateVisitsPrevented += 1
          continue
        }

        visited.add(entry.nodeId)
        discovered.push(entry.nodeId)
        distances.set(entry.nodeId, entry.hops)
        costs.set(entry.nodeId, entry.cost)
        order.set(entry.nodeId, discovered.length - 1)
        if (entry.hops > traversalDepth) traversalDepth = entry.hops

        // Depth cap: nodes at maxDepth are emitted but never expanded.
        if (entry.hops >= request.maxDepth) {
          if (hopEdges(graph, entry.nodeId, direction, request.relationshipTypes).length > 0) {
            truncated = true
          }
          continue
        }

        const hops = hopEdges(graph, entry.nodeId, direction, request.relationshipTypes)
        edgesExamined += hops.length

        for (const hop of hops) {
          if (visited.has(hop.nextId)) {
            duplicateVisitsPrevented += 1
            continue
          }
          queue.push({
            cost: entry.cost + hop.weight + this.heuristic(hop.nextId, graph),
            hops: entry.hops + 1,
            nodeId: hop.nextId,
          })
        }

        if (queue.size > maxQueueSize) maxQueueSize = queue.size
      }
    } catch (error) {
      if (error instanceof GraphNodeNotFoundError) throw error
      throw new GraphTraversalError('Unexpected failure during weighted traversal', {
        cause: error instanceof Error ? error.message : String(error),
      })
    }

    const nodes: TraversalNode[] = discovered.map((id, index) => ({
      id,
      distance: distances.get(id) ?? 0,
      cost: costs.get(id) ?? 0,
      order: index,
      parentIds: parentIdsOf(graph, id, direction),
    }))

    const metadata: GraphTraversalMetadata = {
      visitedNodeCount: discovered.length,
      traversalDepth,
      edgesExamined,
      duplicateVisitsPrevented,
      maxQueueSize,
      traversalDurationMs: performance.now() - startedAt,
    }

    return {
      entryNodeId: request.entryNodeId,
      nodes,
      order,
      distances,
      costs,
      truncated,
      metadata,
    }
  }

  assertSupportedDepth(maxDepth: number): void {
    assertSupportedDepth(maxDepth)
  }
}
