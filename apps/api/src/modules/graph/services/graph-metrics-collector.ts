import { Injectable } from '@nestjs/common'
import type { GraphMetrics } from '../domain/metrics'
import type { GraphTraversalResult } from '../domain/traversal'

/**
 * Derives the platform metrics view from a raw traversal result. The engine
 * only records counters; this collector produces the reported shape and
 * leaves observability adapters (Prometheus, Datadog) to consume it.
 */
@Injectable()
export class GraphMetricsCollector {
  collect(result: GraphTraversalResult): GraphMetrics {
    const { metadata } = result
    const reachableNodeCount = Math.max(0, metadata.visitedNodeCount - 1)
    return {
      entryNodeId: result.entryNodeId,
      visitedNodeCount: metadata.visitedNodeCount,
      traversalDepth: metadata.traversalDepth,
      edgesExamined: metadata.edgesExamined,
      duplicateVisitsPrevented: metadata.duplicateVisitsPrevented,
      maxQueueSize: metadata.maxQueueSize,
      traversalDurationMs: metadata.traversalDurationMs,
      reachableNodeCount,
      traversalEfficiency:
        metadata.visitedNodeCount > 0 ? metadata.edgesExamined / metadata.visitedNodeCount : 0,
    }
  }
}
