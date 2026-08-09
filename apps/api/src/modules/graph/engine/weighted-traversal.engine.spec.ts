import { describe, expect, it } from 'vitest'
import { TraversalDirection } from '../domain/graph-direction'
import { GraphNodeNotFoundError } from '../errors/graph-errors'
import { WeightedTraversalEngine } from './weighted-traversal.engine'
import {
  cycleGraph,
  disconnectedGraph,
  fixtureToGraph,
  largeGraph,
  linearChain,
  makeEdgeEntity,
  makeNodeProjection,
  multiParentGraph,
  sharedAncestorGraph,
} from '../testing/graph-fixtures'

const engine = new WeightedTraversalEngine()

describe('WeightedTraversalEngine', () => {
  describe('cost accumulation', () => {
    it('accumulates edge weights along a chain', () => {
      const fixture = {
        nodes: ['n0', 'n1', 'n2'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e0', 'n0', 'n1', 'SUPPORTS', 0.5),
          makeEdgeEntity('e1', 'n1', 'n2', 'SUPPORTS', 0.25),
        ],
      }
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.costs?.get('n0')).toBe(0)
      expect(result.costs?.get('n1')).toBeCloseTo(0.5)
      expect(result.costs?.get('n2')).toBeCloseTo(0.75)
      // Hops are still tracked alongside costs.
      expect(result.distances.get('n2')).toBe(2)
      expect(result.nodes.find((node) => node.id === 'n2')?.cost).toBeCloseTo(0.75)
    })

    it('prefers the lower-cost path when two routes reach a node', () => {
      const fixture = {
        nodes: ['n0', 'n1', 'n2', 'n3'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e0', 'n0', 'n1', 'SUPPORTS', 1),
          makeEdgeEntity('e1', 'n0', 'n2', 'SUPPORTS', 0.1),
          makeEdgeEntity('e2', 'n1', 'n3', 'SUPPORTS', 0.1),
          makeEdgeEntity('e3', 'n2', 'n3', 'SUPPORTS', 0.5),
        ],
      }
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      // Via n2: 0.1 + 0.5 = 0.6 beats via n1: 1 + 0.1 = 1.1.
      expect(result.costs?.get('n3')).toBeCloseTo(0.6)
      expect(result.costs?.get('n2')).toBeCloseTo(0.1)
      expect(result.costs?.get('n1')).toBeCloseTo(1)
    })

    it('reports hops of the lowest-cost path, which may not be the minimum hops', () => {
      // Direct n0 -> n1 costs 0.1 (1 hop); via n2 costs 0.05 + 0.02 (2 hops).
      const fixture = {
        nodes: ['n0', 'n1', 'n2'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e0', 'n0', 'n1', 'SUPPORTS', 0.1),
          makeEdgeEntity('e1', 'n0', 'n2', 'SUPPORTS', 0.05),
          makeEdgeEntity('e2', 'n2', 'n1', 'SUPPORTS', 0.02),
        ],
      }
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.costs?.get('n1')).toBeCloseTo(0.07)
      expect(result.distances.get('n1')).toBe(2)
    })
  })

  describe('expansion order', () => {
    it('expands lower-cost nodes before higher-cost ones', () => {
      const fixture = {
        nodes: ['n0', 'n1', 'n2', 'n3'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e0', 'n0', 'n1', 'SUPPORTS', 0.9),
          makeEdgeEntity('e1', 'n0', 'n2', 'SUPPORTS', 0.1),
          makeEdgeEntity('e2', 'n1', 'n3', 'SUPPORTS', 0.1),
          makeEdgeEntity('e3', 'n2', 'n3', 'SUPPORTS', 0.1),
        ],
      }
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      // Expansion follows cost: n2 (0.1), then n3 (0.2 via n2), then n1 (0.9).
      expect(result.order.get('n2')).toBe(1)
      expect(result.order.get('n3')).toBe(2)
      expect(result.order.get('n1')).toBe(3)
    })

    it('is deterministic regardless of edge insertion order', () => {
      const fixture = multiParentGraph()
      const reversed = { ...fixture, edges: [...fixture.edges].reverse() }
      const a = engine.traverse(fixtureToGraph(fixture), { entryNodeId: 'entry', maxDepth: 10 })
      const b = engine.traverse(fixtureToGraph(reversed), { entryNodeId: 'entry', maxDepth: 10 })
      expect(a.nodes.map((node) => node.id)).toEqual(b.nodes.map((node) => node.id))
    })
  })

  describe('shared ancestors and duplicates', () => {
    it('finalizes a shared ancestor once and counts stale/duplicate visits', () => {
      const result = engine.traverse(fixtureToGraph(sharedAncestorGraph()), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      const ids = result.nodes.map((node) => node.id)
      expect(ids.filter((id) => id === 'n3')).toHaveLength(1)
      expect(result.distances.get('n3')).toBe(2)
      expect(result.metadata.duplicateVisitsPrevented).toBeGreaterThan(0)
    })
  })

  describe('depth and filters', () => {
    it('truncates at maxDepth and reports it', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(4)), {
        entryNodeId: 'n0',
        maxDepth: 2,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2'])
      expect(result.truncated).toBe(true)
    })

    it('only follows edges of the requested relationship types', () => {
      const fixture = {
        nodes: ['n0', 'n1', 'n2'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e0', 'n0', 'n1', 'SUPPORTS', 0.5),
          makeEdgeEntity('e1', 'n0', 'n2', 'CONTRADICTS', 0.5),
        ],
      }
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10,
        relationshipTypes: ['SUPPORTS'],
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1'])
    })

    it('traverses downward when requested', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(3)), {
        entryNodeId: 'n2',
        maxDepth: 10,
        direction: TraversalDirection.DOWN,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n2', 'n1', 'n0'])
      expect(result.costs?.get('n0')).toBeCloseTo(2)
    })
  })

  describe('robustness', () => {
    it('throws GraphNodeNotFoundError for a missing entry node', () => {
      expect(() =>
        engine.traverse(fixtureToGraph({ nodes: [], edges: [] }), {
          entryNodeId: 'ghost',
          maxDepth: 10,
        }),
      ).toThrow(GraphNodeNotFoundError)
    })

    it('terminates on cyclic graphs via the visited set', () => {
      const result = engine.traverse(fixtureToGraph(cycleGraph()), {
        entryNodeId: 'a',
        maxDepth: 10,
      })
      expect(result.metadata.visitedNodeCount).toBe(3)
    })

    it('only visits the component reachable from the entry node', () => {
      const result = engine.traverse(fixtureToGraph(disconnectedGraph()), {
        entryNodeId: 'a0',
        maxDepth: 10,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['a0', 'a1'])
    })

    it('handles a 10,000-node DAG quickly and completely', () => {
      const fixture = largeGraph(10_000, 3)
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10_000,
      })
      expect(result.metadata.visitedNodeCount).toBe(10_000)
      expect(result.metadata.traversalDurationMs).toBeLessThan(5_000)
    })
  })

  describe('contract parity with BFS', () => {
    it('returns the same result shape plus costs', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(3)), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.entryNodeId).toBe('n0')
      expect(result.nodes).toHaveLength(3)
      expect(result.order).toBeInstanceOf(Map)
      expect(result.distances).toBeInstanceOf(Map)
      expect(result.costs).toBeInstanceOf(Map)
      expect(result.metadata.visitedNodeCount).toBe(3)
    })
  })
})
