import { describe, expect, it } from 'vitest'
import { TraversalDirection } from '../domain/graph-direction'
import { GraphCycleDetectedError, InvalidGraphError } from '../errors/graph-errors'
import { GraphBuilder } from './graph-builder'
import { GraphValidator } from './graph-validator'
import { CycleDetector } from './cycle-detector'
import {
  brokenEdgeGraph,
  cycleGraph,
  linearChain,
  sharedAncestorGraph,
} from '../testing/graph-fixtures'

const builder = new GraphBuilder(new GraphValidator(new CycleDetector()))

describe('GraphBuilder', () => {
  it('builds a graph with correct upward adjacency', () => {
    const fixture = sharedAncestorGraph()
    const graph = builder.build(fixture.nodes, fixture.edges)
    expect(graph.nodeCount).toBe(4)
    // n0's parents (one hop up) are n1 and n2.
    expect(
      graph
        .parentsOf('n0')
        .map((edge) => edge.targetId)
        .sort(),
    ).toEqual(['n1', 'n2'])
    // n3 is the parent of both n1 and n2.
    expect(graph.parentsOf('n1').map((edge) => edge.targetId)).toEqual(['n3'])
    expect(graph.parentsOf('n2').map((edge) => edge.targetId)).toEqual(['n3'])
    // childrenOf is the reverse view.
    expect(
      graph
        .childrenOf('n3')
        .map((edge) => edge.sourceId)
        .sort(),
    ).toEqual(['n1', 'n2'])
  })

  it('applies DOWN direction by reversing the adjacency', () => {
    const fixture = linearChain(3)
    const graph = builder.build(fixture.nodes, fixture.edges, {
      direction: TraversalDirection.DOWN,
    })
    // Under DOWN, n0 (source) is the parent of n1 (target), so the hop out of
    // n1 points at the edge's source endpoint.
    expect(graph.parentsOf('n1').map((edge) => edge.sourceId)).toEqual(['n0'])
  })

  it('validates by default and throws on cycles', () => {
    const fixture = cycleGraph()
    expect(() => builder.build(fixture.nodes, fixture.edges)).toThrow(GraphCycleDetectedError)
  })

  it('throws InvalidGraphError for non-cycle integrity violations', () => {
    const fixture = brokenEdgeGraph()
    expect(() => builder.build(fixture.nodes, fixture.edges)).toThrow(InvalidGraphError)
  })

  it('skips validation when disabled', () => {
    const fixture = cycleGraph()
    const graph = builder.build(fixture.nodes, fixture.edges, { validate: false })
    expect(graph.nodeCount).toBe(3)
  })

  it('silently drops broken edges from the adjacency', () => {
    const fixture = brokenEdgeGraph()
    const graph = builder.build(fixture.nodes, fixture.edges, { validate: false })
    expect(graph.parentsOf('n0')).toEqual([])
    expect(graph.nodeCount).toBe(1)
  })
})
