/* MCP Tool Schemas — unit tests for input validation. */

import { describe, it, expect } from 'vitest'
import {
  resolveContextInputSchema,
  getSubgraphInputSchema,
  getRunInputSchema,
  replayRunInputSchema,
} from '../schemas/mcp-tool-schemas'

describe('resolveContextInputSchema', () => {
  it('accepts valid input', () => {
    const result = resolveContextInputSchema.parse({
      query: 'What is the API policy?',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.query).toBe('What is the API policy?')
    expect(result.workspaceId).toBe('00000000-0000-0000-0000-000000000001')
    expect(result.topK).toBe(20)
    expect(result.tokenBudget).toBe(4096)
    expect(result.executionMode).toBe('STANDARD')
  })

  it('rejects empty query', () => {
    expect(() =>
      resolveContextInputSchema.parse({
        query: '',
        workspaceId: '00000000-0000-0000-0000-000000000001',
      }),
    ).toThrow()
  })

  it('rejects invalid UUID', () => {
    expect(() =>
      resolveContextInputSchema.parse({
        query: 'test',
        workspaceId: 'not-a-uuid',
      }),
    ).toThrow()
  })

  it('rejects topK > 100', () => {
    expect(() =>
      resolveContextInputSchema.parse({
        query: 'test',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        topK: 200,
      }),
    ).toThrow()
  })

  it('rejects tokenBudget < 256', () => {
    expect(() =>
      resolveContextInputSchema.parse({
        query: 'test',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        tokenBudget: 100,
      }),
    ).toThrow()
  })

  it('rejects invalid executionMode', () => {
    expect(() =>
      resolveContextInputSchema.parse({
        query: 'test',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        executionMode: 'INVALID',
      }),
    ).toThrow()
  })

  it('strips unknown fields (does not include them in output)', () => {
    const result = resolveContextInputSchema.parse({
      query: 'test',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      maliciousField: 'injected',
    })
    expect(result).not.toHaveProperty('maliciousField')
    expect(Object.keys(result)).not.toContain('maliciousField')
  })
})

describe('getSubgraphInputSchema', () => {
  it('accepts valid input', () => {
    const result = getSubgraphInputSchema.parse({
      nodeId: '00000000-0000-0000-0000-000000000001',
      workspaceId: '00000000-0000-0000-0000-000000000002',
    })
    expect(result.maxDepth).toBe(3)
    expect(result.direction).toBe('outgoing')
  })

  it('rejects maxDepth > 10', () => {
    expect(() =>
      getSubgraphInputSchema.parse({
        nodeId: '00000000-0000-0000-0000-000000000001',
        workspaceId: '00000000-0000-0000-0000-000000000002',
        maxDepth: 20,
      }),
    ).toThrow()
  })

  it('rejects invalid direction', () => {
    expect(() =>
      getSubgraphInputSchema.parse({
        nodeId: '00000000-0000-0000-0000-000000000001',
        workspaceId: '00000000-0000-0000-0000-000000000002',
        direction: 'sideways',
      }),
    ).toThrow()
  })
})

describe('getRunInputSchema', () => {
  it('accepts valid input', () => {
    const result = getRunInputSchema.parse({
      runId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.runId).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('rejects invalid UUID', () => {
    expect(() => getRunInputSchema.parse({ runId: 'bad' })).toThrow()
  })
})

describe('replayRunInputSchema', () => {
  it('accepts valid input without options', () => {
    const result = replayRunInputSchema.parse({
      runId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.options).toBeUndefined()
  })

  it('accepts valid input with options', () => {
    const result = replayRunInputSchema.parse({
      runId: '00000000-0000-0000-0000-000000000001',
      options: {
        executionMode: 'DEBUG',
        tokenBudget: 8192,
      },
    })
    expect(result.options?.executionMode).toBe('DEBUG')
    expect(result.options?.tokenBudget).toBe(8192)
  })
})
