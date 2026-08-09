import type { GraphTraversalMetadata } from './traversal'
import type { GraphNodeId } from './graph-node'

/**
 * Aggregated metrics of a traversal run. `GraphTraversalMetadata` holds raw
 * counters; this view adds the derived figures the platform reports. Kept
 * framework-agnostic so observability (Prometheus, Datadog, …) can be plugged
 * in later without touching the engine.
 */
export interface GraphMetrics extends GraphTraversalMetadata {
  readonly entryNodeId: GraphNodeId
  /** Unique nodes reachable from the entry node (visited minus the entry). */
  readonly reachableNodeCount: number
  /** edgesExamined / visitedNodeCount — how many hops were needed per node. */
  readonly traversalEfficiency: number
}
