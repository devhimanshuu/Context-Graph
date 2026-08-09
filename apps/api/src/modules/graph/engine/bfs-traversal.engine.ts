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

/**
 * Iterative breadth-first search over a domain `Graph`.
 *
 * Guarantees:
 * - O(V + E): index-based FIFO queue (no `shift()`), visited `Set`, each
 *   node expanded at most once.
 * - Shortest distances: BFS processes nodes in non-decreasing hop order, so
 *   the first discovery of a node is its shortest distance from the entry.
 * - Shared ancestors are processed exactly once; re-discoveries are counted
 *   in `duplicateVisitsPrevented` and never re-enqueued.
 * - Deterministic: neighbors are expanded in lexicographic node-id order, so
 *   traversal order is stable regardless of database insertion order.
 * - No recursion: safe for 100k+ node graphs.
 *
 * Edge weights do not influence BFS ordering — see `WeightedTraversalEngine`
 * for the weighted strategy (A-star / Dijkstra).
 */
@Injectable()
export class BfsTraversalEngine implements IGraphTraversalEngine {
  traverse(graph: Graph, request: GraphTraversalRequest): GraphTraversalResult {
    if (!graph.hasNode(request.entryNodeId)) {
      throw new GraphNodeNotFoundError(request.entryNodeId)
    }

    const startedAt = performance.now()
    const visited = new Set<GraphNodeId>([request.entryNodeId])
    const queue: GraphNodeId[] = [request.entryNodeId]
    let queueHead = 0
    let maxQueueSize = 1

    const distances = new Map<GraphNodeId, number>([[request.entryNodeId, 0]])
    const order = new Map<GraphNodeId, number>([[request.entryNodeId, 0]])
    const discovered: GraphNodeId[] = [request.entryNodeId]

    let edgesExamined = 0
    let duplicateVisitsPrevented = 0
    let traversalDepth = 0
    let truncated = false

    const direction = request.direction ?? TraversalDirection.UP

    try {
      while (queueHead < queue.length) {
        const current = queue[queueHead]
        queueHead += 1
        if (current === undefined) break // unreachable while queueHead < length
        const currentDistance = distances.get(current) ?? 0

        // Depth cap: nodes at maxDepth are emitted but never expanded.
        if (currentDistance >= request.maxDepth) {
          if (hopEdges(graph, current, direction, request.relationshipTypes).length > 0) {
            truncated = true
          }
          continue
        }

        const candidates = hopEdges(graph, current, direction, request.relationshipTypes).map(
          (hop) => hop.nextId,
        )
        edgesExamined += candidates.length

        // Deterministic expansion: lexicographic order by next-node id.
        candidates.sort()

        for (const nextId of candidates) {
          if (visited.has(nextId)) {
            duplicateVisitsPrevented += 1
            continue
          }
          visited.add(nextId)
          const distance = currentDistance + 1
          distances.set(nextId, distance)
          order.set(nextId, discovered.length)
          discovered.push(nextId)
          queue.push(nextId)
          // Depth only grows when a node is actually discovered at a new level.
          if (distance > traversalDepth) traversalDepth = distance
          if (queue.length - queueHead > maxQueueSize) {
            maxQueueSize = queue.length - queueHead
          }
        }
      }
    } catch (error) {
      if (error instanceof GraphNodeNotFoundError) throw error
      throw new GraphTraversalError('Unexpected failure during graph traversal', {
        cause: error instanceof Error ? error.message : String(error),
      })
    }

    const nodes: TraversalNode[] = discovered.map((id, index) => ({
      id,
      distance: distances.get(id) ?? 0,
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

    return { entryNodeId: request.entryNodeId, nodes, order, distances, truncated, metadata }
  }

  assertSupportedDepth(maxDepth: number): void {
    assertSupportedDepth(maxDepth)
  }
}
