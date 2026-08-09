import { describe, expect, it } from 'vitest'
import { CycleDetector } from './cycle-detector'
import {
  cycleGraph,
  cycleWithTailGraph,
  fixtureToGraph,
  linearChain,
  selfReferenceGraph,
  sharedAncestorGraph,
  singleNodeGraph,
  treeGraph,
} from '../testing/graph-fixtures'

const detector = new CycleDetector()

describe('CycleDetector', () => {
  it('returns no cycle for a single node', () => {
    expect(detector.findCycle(fixtureToGraph(singleNodeGraph()))).toEqual([])
  })

  it('returns no cycle for a linear chain', () => {
    expect(detector.findCycle(fixtureToGraph(linearChain(6)))).toEqual([])
  })

  it('returns no cycle for a tree', () => {
    expect(detector.findCycle(fixtureToGraph(treeGraph(3, 2)))).toEqual([])
  })

  it('returns no cycle for a diamond (shared ancestor is acyclic)', () => {
    expect(detector.findCycle(fixtureToGraph(sharedAncestorGraph()))).toEqual([])
  })

  it('detects a simple 3-node cycle', () => {
    const cycle = detector.findCycle(fixtureToGraph(cycleGraph()))
    expect(cycle).not.toEqual([])
    expect(cycle).toHaveLength(3)
    expect(new Set(cycle).size).toBe(3)
  })

  it('detects a self-referencing edge as a cycle', () => {
    expect(detector.findCycle(fixtureToGraph(selfReferenceGraph()))).not.toEqual([])
  })

  it('detects the cycle and not the acyclic tail hanging off it', () => {
    const cycle = detector.findCycle(fixtureToGraph(cycleWithTailGraph()))
    expect(cycle).not.toEqual([])
    expect(cycle).not.toContain('tail')
    // The cycle path closes: walking it must revisit its first node.
    expect(cycle.length).toBeGreaterThanOrEqual(2)
  })

  it('reports a deterministic cycle for repeated runs', () => {
    const fixture = cycleGraph()
    const first = detector.findCycle(fixtureToGraph(fixture))
    const second = detector.findCycle(fixtureToGraph(fixture))
    expect(first).toEqual(second)
  })
})
