import { describe, it, expect, beforeEach } from 'vitest'
import { ContextBudgetManager } from './context-budget-manager.service'
import type { ContextItem, ContextBudgetConstraints } from '../domain/ai.types'

describe('ContextBudgetManager', () => {
  let manager: ContextBudgetManager

  beforeEach(() => {
    manager = new ContextBudgetManager()
  })

  const createMockItem = (overrides: Partial<ContextItem> = {}): ContextItem => ({
    id: 'node-1',
    nodeId: 'node-1',
    title: 'Test Node',
    content: 'Test content',
    type: 'FACT',
    importance: 50,
    distance: 1,
    priority: 'NORMAL',
    compressionHint: 'FULL',
    inclusionReason: 'GRAPH_TRAVERSAL',
    complianceTags: ['INTERNAL'],
    source: {
      nodeId: 'node-1',
      organizationId: 'org-1',
      departmentId: null,
      workspaceId: 'workspace-1',
      version: null,
    },
    tokens: 100,
    rank: 1,
    ...overrides,
  })

  const defaultConstraints: ContextBudgetConstraints = {
    maxCandidates: 10,
    maxCharacters: 10000,
    maxTokens: 5000,
    maxContentSize: 20000,
    maxSourceCount: 5,
  }

  it('should include all items within budget', () => {
    const items = [createMockItem({ tokens: 100 }), createMockItem({ id: 'node-2', tokens: 200 })]
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included).toHaveLength(2)
    expect(result.excluded).toHaveLength(0)
    expect(result.truncated).toBe(false)
    expect(result.totalTokens).toBe(300)
  })

  it('should exclude items exceeding token budget', () => {
    const items = [createMockItem({ tokens: 3000 }), createMockItem({ id: 'node-2', tokens: 3000 })]
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included).toHaveLength(1)
    expect(result.excluded).toHaveLength(1)
    expect(result.truncated).toBe(true)
    expect(result.exclusionReasons.get('node-2')).toBe('TOKEN_BUDGET_EXCEEDED')
  })

  it('should exclude items exceeding candidate limit', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      createMockItem({ id: `node-${i}`, tokens: 10 }),
    )
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included).toHaveLength(10)
    expect(result.excluded).toHaveLength(5)
    expect(result.truncated).toBe(true)
  })

  it('should prioritize CRITICAL items', () => {
    const items = [
      createMockItem({ id: 'node-1', priority: 'LOW', tokens: 100, rank: 1 }),
      createMockItem({ id: 'node-2', priority: 'CRITICAL', tokens: 100, rank: 2 }),
    ]
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included[0].id).toBe('node-2') // CRITICAL first
    expect(result.included[1].id).toBe('node-1')
  })

  it('should sort by priority then rank within same priority', () => {
    const items = [
      createMockItem({ id: 'node-1', priority: 'NORMAL', rank: 3 }),
      createMockItem({ id: 'node-2', priority: 'NORMAL', rank: 1 }),
      createMockItem({ id: 'node-3', priority: 'HIGH', rank: 2 }),
    ]
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included[0].id).toBe('node-3') // HIGH
    expect(result.included[1].id).toBe('node-2') // NORMAL, rank 1
    expect(result.included[2].id).toBe('node-1') // NORMAL, rank 3
  })

  it('should exclude items exceeding character budget', () => {
    const items = [
      createMockItem({ content: 'a'.repeat(6000), tokens: 100 }),
      createMockItem({ id: 'node-2', content: 'b'.repeat(6000), tokens: 100 }),
    ]
    const result = manager.fitToBudget(items, defaultConstraints)

    expect(result.included).toHaveLength(1)
    expect(result.excluded).toHaveLength(1)
    expect(result.exclusionReasons.get('node-2')).toBe('CHARACTER_BUDGET_EXCEEDED')
  })

  it('should track source count', () => {
    const items = [
      createMockItem({
        source: {
          nodeId: 'node-1',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
      createMockItem({
        id: 'node-2',
        source: {
          nodeId: 'node-2',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
    ]
    const result = manager.fitToBudget(items, defaultConstraints)

    // Same source node, so sourceCount should be 1
    expect(result.included).toHaveLength(2)
  })

  it('should exclude items exceeding source count limit', () => {
    const constraints = { ...defaultConstraints, maxSourceCount: 2 }
    const items = [
      createMockItem({
        source: {
          nodeId: 'node-1',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
      createMockItem({
        id: 'node-2',
        source: {
          nodeId: 'node-2',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
      createMockItem({
        id: 'node-3',
        source: {
          nodeId: 'node-3',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
    ]
    const result = manager.fitToBudget(items, constraints)

    expect(result.included).toHaveLength(2)
    expect(result.excluded).toHaveLength(1)
    expect(result.exclusionReasons.get('node-3')).toBe('SOURCE_COUNT_EXCEEDED')
  })

  it('should assign priority correctly', () => {
    const critical = manager.assignPriority(createMockItem({ importance: 95 }))
    const high = manager.assignPriority(createMockItem({ importance: 75 }))
    const normal = manager.assignPriority(createMockItem({ importance: 50, distance: 0 }))
    const low = manager.assignPriority(createMockItem({ importance: 50, distance: 3 }))

    expect(critical).toBe('CRITICAL')
    expect(high).toBe('HIGH')
    expect(normal).toBe('NORMAL')
    expect(low).toBe('LOW')
  })
})
