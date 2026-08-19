import { describe, it, expect, beforeEach } from 'vitest'
import { CitationValidator } from './citation-validator.service'
import type { AssembledContext, ContextItem } from '../domain/ai.types'

describe('CitationValidator', () => {
  let validator: CitationValidator

  beforeEach(() => {
    validator = new CitationValidator()
  })

  const createMockContext = (items: Partial<ContextItem>[] = []): AssembledContext => {
    const defaultItems: ContextItem[] = [
      {
        id: 'node-1',
        nodeId: 'node-1',
        title: 'Clinical Policy',
        content: 'Content 1',
        type: 'FACT',
        importance: 80,
        distance: 0,
        priority: 'HIGH',
        compressionHint: 'FULL',
        inclusionReason: 'GRAPH_TRAVERSAL',
        complianceTags: ['HIPAA'],
        source: {
          nodeId: 'node-1',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
        tokens: 100,
        rank: 1,
      },
      {
        id: 'node-2',
        nodeId: 'node-2',
        title: 'Safety Protocol',
        content: 'Content 2',
        type: 'CONSTRAINT',
        importance: 90,
        distance: 1,
        priority: 'CRITICAL',
        compressionHint: 'FULL',
        inclusionReason: 'GLOBAL_INJECTION',
        complianceTags: ['RESTRICTED'],
        source: {
          nodeId: 'node-2',
          organizationId: 'org-1',
          departmentId: 'dept-1',
          workspaceId: 'ws-1',
          version: '1.0',
        },
        tokens: 150,
        rank: 2,
      },
    ]

    return {
      items:
        items.length > 0
          ? items.map((item, i) => ({ ...defaultItems[i % defaultItems.length], ...item }))
          : defaultItems,
      totalTokens: 250,
      sourceCount: 2,
      contextVersion: '1.0.0',
      contextHash: 'test-hash',
      assembledAt: new Date().toISOString(),
      entryNodeId: 'node-1',
      workspaceId: 'ws-1',
    }
  }

  it('should validate valid citations', () => {
    const context = createMockContext()
    const response = 'According to [1], the policy states... Also see [2] for details.'

    const result = validator.validate(response, context)

    expect(result.valid).toBe(true)
    expect(result.citations).toHaveLength(2)
    expect(result.citations[0].valid).toBe(true)
    expect(result.citations[1].valid).toBe(true)
  })

  it('should detect invalid citation indices', () => {
    const context = createMockContext()
    const response = 'See [5] for more info.'

    const result = validator.validate(response, context)

    expect(result.valid).toBe(false)
    expect(result.invalidCount).toBe(1)
    expect(result.citations[0].valid).toBe(false)
    expect(result.citations[0].validationError).toContain('out of range')
  })

  it('should handle zero-based citations as invalid', () => {
    const context = createMockContext()
    const response = 'See [0] for info.'

    const result = validator.validate(response, context)

    expect(result.valid).toBe(false)
    expect(result.citations[0].valid).toBe(false)
  })

  it('should handle no citations', () => {
    const context = createMockContext()
    const response = 'This response has no citations.'

    const result = validator.validate(response, context)

    expect(result.valid).toBe(true)
    expect(result.citations).toHaveLength(0)
  })

  it('should map citations to correct context items', () => {
    const context = createMockContext()
    const response = '[1] and [2]'

    const result = validator.validate(response, context)

    expect(result.citations[0].nodeId).toBe('node-1')
    expect(result.citations[0].title).toBe('Clinical Policy')
    expect(result.citations[1].nodeId).toBe('node-2')
    expect(result.citations[1].title).toBe('Safety Protocol')
  })

  it('should handle duplicate citations', () => {
    const context = createMockContext()
    const response = '[1] and [1] again'

    const result = validator.validate(response, context)

    // Should only count each citation once
    expect(result.citations).toHaveLength(1)
  })

  it('should handle empty context', () => {
    // Create context with no items
    const emptyContext = {
      items: [],
      totalTokens: 0,
      sourceCount: 0,
      contextVersion: '1.0.0',
      contextHash: 'test-hash',
      assembledAt: new Date().toISOString(),
      entryNodeId: 'node-1',
      workspaceId: 'ws-1',
    }
    const response = 'See [1] for info.'

    const result = validator.validate(response, emptyContext)

    expect(result.valid).toBe(false)
    expect(result.invalidCount).toBe(1)
    expect(result.citations[0].valid).toBe(false)
  })
})
