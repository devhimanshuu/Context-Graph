/* Unit tests for Workflow Scheduler — validates ready node detection and completion logic. */

import { describe, it, expect } from 'vitest'
import { WorkflowScheduler } from './workflow-scheduler'
import { type WorkflowNode, type WorkflowEdge, type WorkflowExecution } from '@contextgraph/types'

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

function makeEdge(source: string, target: string): WorkflowEdge {
  return {
    edgeId: `e-${source}-${target}`,
    sourceNodeId: source,
    targetNodeId: target,
    condition: null,
  }
}

function makeExecution(overrides: Partial<WorkflowExecution> = {}): WorkflowExecution {
  return {
    executionId: 'exec-1',
    workflowId: 'wf-1',
    workflowVersion: 1,
    organizationId: 'org-1',
    userId: 'user-1',
    workspaceId: null,
    status: 'RUNNING',
    input: {},
    output: null,
    currentNodes: [],
    completedNodes: [],
    failedNodes: [],
    error: null,
    tokenUsage: 0,
    estimatedCost: 0,
    startedAt: '',
    completedAt: null,
    createdAt: '',
    ...overrides,
  }
}

describe('WorkflowScheduler', () => {
  const scheduler = new WorkflowScheduler()

  describe('getReadyNodes', () => {
    it('should return entry nodes when nothing is completed', () => {
      const nodes = [
        makeNode('start', 'START'),
        makeNode('a'),
        makeNode('b'),
        makeNode('end', 'END'),
      ]
      const edges = [
        makeEdge('start', 'a'),
        makeEdge('start', 'b'),
        makeEdge('a', 'end'),
        makeEdge('b', 'end'),
      ]
      const exec = makeExecution()

      const ready = scheduler.getReadyNodes(exec, nodes, edges, [], [], [])
      expect(ready.map((n) => n.nodeId)).toContain('start')
    })

    it('should return parallel nodes after start completes', () => {
      const nodes = [
        makeNode('start', 'START'),
        makeNode('a'),
        makeNode('b'),
        makeNode('end', 'END'),
      ]
      const edges = [
        makeEdge('start', 'a'),
        makeEdge('start', 'b'),
        makeEdge('a', 'end'),
        makeEdge('b', 'end'),
      ]
      const exec = makeExecution()

      const ready = scheduler.getReadyNodes(exec, nodes, edges, ['start'], [], [])
      const readyIds = ready.map((n) => n.nodeId)
      expect(readyIds).toContain('a')
      expect(readyIds).toContain('b')
      expect(readyIds).not.toContain('end')
    })

    it('should wait for all dependencies before scheduling merge', () => {
      const nodes = [
        makeNode('a'),
        makeNode('b'),
        makeNode('merge', 'MERGE'),
        makeNode('end', 'END'),
      ]
      const edges = [makeEdge('a', 'merge'), makeEdge('b', 'merge'), makeEdge('merge', 'end')]
      const exec = makeExecution()

      // Only 'a' completed — merge should NOT be ready
      const ready = scheduler.getReadyNodes(exec, nodes, edges, ['a'], [], [])
      expect(ready.map((n) => n.nodeId)).not.toContain('merge')
    })

    it('should schedule merge after all upstream nodes complete', () => {
      const nodes = [
        makeNode('a'),
        makeNode('b'),
        makeNode('merge', 'MERGE'),
        makeNode('end', 'END'),
      ]
      const edges = [makeEdge('a', 'merge'), makeEdge('b', 'merge'), makeEdge('merge', 'end')]
      const exec = makeExecution()

      const ready = scheduler.getReadyNodes(exec, nodes, edges, ['a', 'b'], [], [])
      expect(ready.map((n) => n.nodeId)).toContain('merge')
    })

    it('should not return running nodes', () => {
      const nodes = [makeNode('a'), makeNode('b')]
      const edges = [makeEdge('a', 'b')]
      const exec = makeExecution()

      const ready = scheduler.getReadyNodes(exec, nodes, edges, [], [], ['a'])
      expect(ready.map((n) => n.nodeId)).not.toContain('a')
    })

    it('should not return failed nodes', () => {
      const nodes = [makeNode('a'), makeNode('b')]
      const edges = [makeEdge('a', 'b')]
      const exec = makeExecution()

      const ready = scheduler.getReadyNodes(exec, nodes, edges, [], ['a'], [])
      expect(ready.map((n) => n.nodeId)).not.toContain('a')
    })
  })

  describe('isWorkflowComplete', () => {
    it('should return true when all nodes are completed', () => {
      const nodes = [makeNode('a'), makeNode('b')]
      expect(scheduler.isWorkflowComplete(nodes, ['a', 'b'], [])).toBe(true)
    })

    it('should return true when all nodes are completed or failed', () => {
      const nodes = [makeNode('a'), makeNode('b')]
      expect(scheduler.isWorkflowComplete(nodes, ['a'], ['b'])).toBe(true)
    })

    it('should return false when some nodes are pending', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
      expect(scheduler.isWorkflowComplete(nodes, ['a', 'b'], [])).toBe(false)
    })
  })

  describe('evaluateCondition', () => {
    it('should evaluate >= correctly', () => {
      const condition = JSON.stringify({ field: 'confidence', operator: '>=', value: 0.8 })
      expect(scheduler.evaluateCondition(condition, { confidence: 0.9 })).toBe(true)
      expect(scheduler.evaluateCondition(condition, { confidence: 0.7 })).toBe(false)
    })

    it('should evaluate == correctly', () => {
      const condition = JSON.stringify({ field: 'status', operator: '==', value: 'ready' })
      expect(scheduler.evaluateCondition(condition, { status: 'ready' })).toBe(true)
      expect(scheduler.evaluateCondition(condition, { status: 'failed' })).toBe(false)
    })

    it('should evaluate exists correctly', () => {
      const condition = JSON.stringify({ field: 'data', operator: 'exists', value: true })
      expect(scheduler.evaluateCondition(condition, { data: 'hello' })).toBe(true)
      expect(scheduler.evaluateCondition(condition, {})).toBe(false)
    })

    it('should fail closed on invalid condition', () => {
      expect(scheduler.evaluateCondition('invalid json', {})).toBe(false)
    })
  })
})
