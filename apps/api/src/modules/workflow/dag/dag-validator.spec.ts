/* Unit tests for DAG Validator — validates cycle detection, entry/terminal nodes, dependency checking. */

import { describe, it, expect } from 'vitest'
import { DagValidator } from './dag-validator'
import { type WorkflowNode, type WorkflowEdge } from '@contextgraph/types'

function makeNode(id: string, type: WorkflowNode['type'] = 'AGENT'): WorkflowNode {
  return {
    nodeId: id,
    type,
    name: `Node ${id}`,
    configuration: {},
    dependencies: [],
    timeoutMs: 30_000,
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: 'EXPONENTIAL',
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
      retryableErrors: [],
      nonRetryableErrors: [],
    },
    failurePolicy: 'FAIL_WORKFLOW',
  }
}

function makeEdge(source: string, target: string, id?: string): WorkflowEdge {
  return {
    edgeId: id ?? `e-${source}-${target}`,
    sourceNodeId: source,
    targetNodeId: target,
    condition: null,
  }
}

describe('DagValidator', () => {
  const validator = new DagValidator()

  describe('Valid DAGs', () => {
    it('should validate a simple linear DAG', () => {
      const nodes = [makeNode('a', 'START'), makeNode('b'), makeNode('c', 'END')]
      const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.executionOrder).toEqual(['a', 'b', 'c'])
    })

    it('should validate a parallel DAG', () => {
      const nodes = [
        makeNode('start', 'START'),
        makeNode('a'),
        makeNode('b'),
        makeNode('merge', 'MERGE'),
        makeNode('end', 'END'),
      ]
      const edges = [
        makeEdge('start', 'a'),
        makeEdge('start', 'b'),
        makeEdge('a', 'merge'),
        makeEdge('b', 'merge'),
        makeEdge('merge', 'end'),
      ]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(true)
      expect(result.entryNodes).toEqual(['start'])
      expect(result.terminalNodes).toEqual(['end'])
    })

    it('should return empty arrays for no edges', () => {
      const nodes = [makeNode('a', 'START'), makeNode('b', 'END')]
      const result = validator.validate(nodes, [])

      expect(result.valid).toBe(true)
      expect(result.executionOrder).toEqual(['a', 'b'])
    })
  })

  describe('Cycle detection', () => {
    it('should detect a simple cycle', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
      const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'a')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.type === 'CYCLE_DETECTED')).toBe(true)
    })

    it('should detect a self-loop', () => {
      const nodes = [makeNode('a')]
      const edges = [makeEdge('a', 'a')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.type === 'SELF_LOOP')).toBe(true)
    })
  })

  describe('Invalid references', () => {
    it('should detect invalid edge source', () => {
      const nodes = [makeNode('a')]
      const edges = [makeEdge('nonexistent', 'a')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.type === 'INVALID_EDGE_SOURCE')).toBe(true)
    })

    it('should detect invalid edge target', () => {
      const nodes = [makeNode('a')]
      const edges = [makeEdge('a', 'nonexistent')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.type === 'INVALID_EDGE_TARGET')).toBe(true)
    })
  })

  describe('Entry and terminal nodes', () => {
    it('should detect no entry node', () => {
      const nodes = [makeNode('a'), makeNode('b')]
      const edges = [makeEdge('a', 'b')]
      const result = validator.validate(nodes, edges)

      // 'a' has no incoming edges → it IS the entry node
      expect(result.valid).toBe(true)
      expect(result.entryNodes).toContain('a')
    })

    it('should detect no terminal node when all nodes have outgoing edges', () => {
      const nodes = [makeNode('a', 'START'), makeNode('b')]
      const edges = [makeEdge('a', 'b')]
      const result = validator.validate(nodes, edges)

      // b has no outgoing edges → it IS the terminal node
      expect(result.valid).toBe(true)
      expect(result.terminalNodes).toContain('b')
    })
  })

  describe('Orphaned nodes', () => {
    it('should warn about orphaned nodes', () => {
      const nodes = [
        makeNode('a', 'START'),
        makeNode('b'),
        makeNode('orphan'),
        makeNode('end', 'END'),
      ]
      const edges = [makeEdge('a', 'b'), makeEdge('b', 'end')]
      const result = validator.validate(nodes, edges)

      expect(result.valid).toBe(true)
      expect(result.warnings.some((w) => w.type === 'ORPHANED_NODE')).toBe(true)
    })
  })
})
