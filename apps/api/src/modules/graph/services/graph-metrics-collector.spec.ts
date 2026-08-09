import { describe, expect, it } from 'vitest'
import type { GraphTraversalResult } from '../domain/traversal'
import { GraphMetricsCollector } from './graph-metrics-collector'

const collector = new GraphMetricsCollector()

function makeResult(visitedNodeCount: number, edgesExamined: number): GraphTraversalResult {
  return {
    entryNodeId: 'entry',
    nodes: [],
    order: new Map(),
    distances: new Map(),
    truncated: false,
    metadata: {
      visitedNodeCount,
      traversalDepth: visitedNodeCount > 0 ? visitedNodeCount - 1 : 0,
      edgesExamined,
      duplicateVisitsPrevented: 2,
      maxQueueSize: 3,
      traversalDurationMs: 1.5,
    },
  }
}

describe('GraphMetricsCollector', () => {
  it('derives reachable count and efficiency from raw metadata', () => {
    const metrics = collector.collect(makeResult(5, 7))
    expect(metrics.entryNodeId).toBe('entry')
    expect(metrics.reachableNodeCount).toBe(4)
    expect(metrics.traversalEfficiency).toBeCloseTo(7 / 5)
    expect(metrics.duplicateVisitsPrevented).toBe(2)
    expect(metrics.maxQueueSize).toBe(3)
  })

  it('reports zero reachable nodes for a single-node traversal', () => {
    const metrics = collector.collect(makeResult(1, 0))
    expect(metrics.reachableNodeCount).toBe(0)
    expect(metrics.traversalEfficiency).toBe(0)
  })
})
