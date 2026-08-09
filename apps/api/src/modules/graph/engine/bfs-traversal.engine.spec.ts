import { describe, expect, it } from 'vitest'
import { RelationshipType } from '@contextgraph/types'
import { TraversalDirection } from '../domain/graph-direction'
import { GraphNodeNotFoundError } from '../errors/graph-errors'
import { BfsTraversalEngine } from './bfs-traversal.engine'
import {
  cycleGraph,
  disconnectedGraph,
  fixtureToGraph,
  largeGraph,
  linearChain,
  makeEdgeEntity,
  makeNodeProjection,
  multiParentGraph,
  selfReferenceGraph,
  sharedAncestorGraph,
  singleNodeGraph,
  treeGraph,
} from '../testing/graph-fixtures'

const engine = new BfsTraversalEngine()

describe('BfsTraversalEngine', () => {
  describe('basic traversal', () => {
    it('traverses a single-node graph (entry only)', () => {
      const result = engine.traverse(fixtureToGraph(singleNodeGraph('n0')), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0'])
      expect(result.distances.get('n0')).toBe(0)
      expect(result.order.get('n0')).toBe(0)
      expect(result.truncated).toBe(false)
      expect(result.metadata.visitedNodeCount).toBe(1)
      expect(result.metadata.traversalDepth).toBe(0)
    })

    it('traverses a linear chain with correct distances and order', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(5)), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'])
      expect([...result.distances.entries()]).toEqual([
        ['n0', 0],
        ['n1', 1],
        ['n2', 2],
        ['n3', 3],
        ['n4', 4],
      ])
      expect(result.metadata.traversalDepth).toBe(4)
    })

    it('walks a tree up its ancestor chain, level by level', () => {
      const fixture = treeGraph(2, 2) // root + 2 children + 4 grandchildren
      // A genuine tree has no shared ancestors, so a single entry only sees
      // its own ancestor chain: leaf -> parent -> root.
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'root-c5',
        maxDepth: 10,
      })
      expect(result.metadata.visitedNodeCount).toBe(3)
      expect(result.metadata.traversalDepth).toBe(2)
      expect(result.distances.get('root-c1')).toBe(1)
      expect(result.distances.get('root')).toBe(2)
    })
  })

  describe('multi-parent and shared ancestors', () => {
    it('processes a shared ancestor exactly once', () => {
      const result = engine.traverse(fixtureToGraph(sharedAncestorGraph()), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      const ids = result.nodes.map((node) => node.id)
      expect(ids).toContain('n3')
      // n3 is reachable via both n1 and n2 but appears once, at distance 2.
      expect(ids.filter((id) => id === 'n3')).toHaveLength(1)
      expect(result.distances.get('n3')).toBe(2)
      expect(result.metadata.duplicateVisitsPrevented).toBeGreaterThan(0)
    })

    it('handles multiple direct parents', () => {
      const result = engine.traverse(fixtureToGraph(multiParentGraph()), {
        entryNodeId: 'entry',
        maxDepth: 10,
      })
      expect(result.distances.get('p1')).toBe(1)
      expect(result.distances.get('p2')).toBe(1)
      expect(result.distances.get('gp')).toBe(2)
      // p2 re-discovers gp after p1, so one duplicate visit is prevented.
      expect(result.metadata.duplicateVisitsPrevented).toBe(1)
    })

    it('reports direct parents (one hop up) of a visited node', () => {
      const result = engine.traverse(fixtureToGraph(multiParentGraph()), {
        entryNodeId: 'entry',
        maxDepth: 10,
      })
      const p1 = result.nodes.find((node) => node.id === 'p1')
      expect(p1?.parentIds).toEqual(['gp'])
    })
  })

  describe('disconnected and missing nodes', () => {
    it('only visits the component reachable from the entry node', () => {
      const result = engine.traverse(fixtureToGraph(disconnectedGraph()), {
        entryNodeId: 'a0',
        maxDepth: 10,
      })
      const ids = result.nodes.map((node) => node.id)
      expect(ids).toEqual(['a0', 'a1'])
      expect(ids).not.toContain('b0')
      expect(ids).not.toContain('b1')
    })

    it('throws GraphNodeNotFoundError for a missing entry node', () => {
      expect(() =>
        engine.traverse(fixtureToGraph(singleNodeGraph('n0')), {
          entryNodeId: 'ghost',
          maxDepth: 10,
        }),
      ).toThrow(GraphNodeNotFoundError)
    })

    it('throws GraphNodeNotFoundError for an empty graph', () => {
      expect(() =>
        engine.traverse(fixtureToGraph({ nodes: [], edges: [] }), {
          entryNodeId: 'n0',
          maxDepth: 10,
        }),
      ).toThrow(GraphNodeNotFoundError)
    })
  })

  describe('depth limits', () => {
    it('truncates at maxDepth and reports it', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(5)), {
        entryNodeId: 'n0',
        maxDepth: 2,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2'])
      expect(result.truncated).toBe(true)
      expect(result.metadata.traversalDepth).toBe(2)
    })

    it('does not truncate when maxDepth covers the whole graph', () => {
      const result = engine.traverse(fixtureToGraph(linearChain(5)), {
        entryNodeId: 'n0',
        maxDepth: 4,
      })
      expect(result.truncated).toBe(false)
      expect(result.metadata.visitedNodeCount).toBe(5)
    })
  })

  describe('relationship-type filtering', () => {
    it('only follows edges of the requested relationship types', () => {
      const fixture = {
        nodes: ['n0', 'n1', 'n2'].map((id) => makeNodeProjection(id)),
        edges: [
          makeEdgeEntity('e1', 'n0', 'n1', RelationshipType.SUPPORTS),
          makeEdgeEntity('e2', 'n0', 'n2', RelationshipType.CONTRADICTS),
        ],
      }
      const graph = fixtureToGraph(fixture)
      const result = engine.traverse(graph, {
        entryNodeId: 'n0',
        maxDepth: 10,
        relationshipTypes: ['SUPPORTS'],
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1'])
    })
  })

  describe('direction', () => {
    it('traverses downward (toward children) when requested', () => {
      // linearChain stores n0 -> n1 (child -> parent). DOWN reverses it:
      // from n1 we reach n0.
      const result = engine.traverse(fixtureToGraph(linearChain(3)), {
        entryNodeId: 'n2',
        maxDepth: 10,
        direction: TraversalDirection.DOWN,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n2', 'n1', 'n0'])
      expect(result.distances.get('n0')).toBe(2)
    })
  })

  describe('cycle safety', () => {
    it('terminates on cyclic graphs via the visited set', () => {
      const result = engine.traverse(fixtureToGraph(cycleGraph()), {
        entryNodeId: 'a',
        maxDepth: 10,
      })
      expect(result.metadata.visitedNodeCount).toBe(3)
      expect(result.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c'])
    })

    it('handles self-referencing edges without looping', () => {
      const result = engine.traverse(fixtureToGraph(selfReferenceGraph()), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.metadata.visitedNodeCount).toBe(2)
      expect(result.distances.get('n0')).toBe(0)
    })
  })

  describe('determinism', () => {
    it('produces identical traversal order regardless of edge insertion order', () => {
      const fixture = multiParentGraph()
      const shuffled = { ...fixture, edges: [...fixture.edges].reverse() }
      const a = engine.traverse(fixtureToGraph(fixture), { entryNodeId: 'entry', maxDepth: 10 })
      const b = engine.traverse(fixtureToGraph(shuffled), { entryNodeId: 'entry', maxDepth: 10 })
      expect(a.nodes.map((node) => node.id)).toEqual(b.nodes.map((node) => node.id))
      expect([...a.distances.entries()]).toEqual([...b.distances.entries()])
    })
  })

  describe('metrics', () => {
    it('collects accurate traversal statistics', () => {
      const result = engine.traverse(fixtureToGraph(sharedAncestorGraph()), {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      const { metadata } = result
      expect(metadata.visitedNodeCount).toBe(4)
      expect(metadata.traversalDepth).toBe(2)
      // Edges examined: n0's 2 + n1's 1 + n2's 1 = 4 (n3 has no parents).
      expect(metadata.edgesExamined).toBe(4)
      expect(metadata.maxQueueSize).toBeGreaterThanOrEqual(2)
      expect(metadata.traversalDurationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('large graphs', () => {
    it('traverses a 10,000-node DAG quickly and completely', () => {
      const fixture = largeGraph(10_000, 3)
      const result = engine.traverse(fixtureToGraph(fixture), {
        entryNodeId: 'n0',
        maxDepth: 10_000,
      })
      expect(result.metadata.visitedNodeCount).toBe(10_000)
      expect(result.metadata.traversalDurationMs).toBeLessThan(2_000)
    })
  })
})
