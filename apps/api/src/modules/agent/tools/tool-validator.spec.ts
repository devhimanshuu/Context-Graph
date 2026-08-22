/* Tool input validator — unit tests. */

import { describe, it, expect } from 'vitest'
import { ToolInputValidator, ToolValidationError } from './tool-validator'
import type { ToolSchema } from '../domain/agent.types'

const schema: ToolSchema = {
  name: 'test_tool',
  description: 'Test tool',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', maxLength: 1000 },
      nodeId: { type: 'string', format: 'uuid' },
      maxResults: { type: 'number' },
    },
    required: ['query'],
  },
  requiredCapabilities: [],
  riskLevel: 'READ_ONLY',
  timeoutMs: 5000,
  enabled: true,
}

describe('ToolInputValidator', () => {
  const validator = new ToolInputValidator()

  it('validates correct input', () => {
    const result = validator.validate('test_tool', { query: 'hello' }, schema)
    expect(result.query).toBe('hello')
  })

  it('rejects missing required fields', () => {
    expect(() => validator.validate('test_tool', {}, schema)).toThrow(ToolValidationError)
  })

  it('rejects unexpected fields', () => {
    expect(() =>
      validator.validate('test_tool', { query: 'hello', extra: 'field' }, schema),
    ).toThrow(ToolValidationError)
  })

  it('rejects oversized input', () => {
    const hugeInput = { query: 'x'.repeat(20_000) }
    expect(() => validator.validate('test_tool', hugeInput, schema)).toThrow(ToolValidationError)
  })

  it('rejects non-object input', () => {
    expect(() =>
      validator.validate(
        'test_tool',
        'not an object' as unknown as Record<string, unknown>,
        schema,
      ),
    ).toThrow(ToolValidationError)
  })

  it('validates UUID format', () => {
    expect(() =>
      validator.validate('test_tool', { query: 'test', nodeId: 'not-a-uuid' }, schema),
    ).toThrow(ToolValidationError)
  })

  it('accepts valid UUID', () => {
    const result = validator.validate(
      'test_tool',
      { query: 'test', nodeId: '550e8400-e29b-41d4-a716-446655440000' },
      schema,
    )
    expect(result.nodeId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('validates string maxLength', () => {
    expect(() => validator.validate('test_tool', { query: 'x'.repeat(2000) }, schema)).toThrow(
      ToolValidationError,
    )
  })
})
