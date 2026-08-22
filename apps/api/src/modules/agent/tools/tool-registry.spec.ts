/* Tool registry — unit tests. */

import { describe, it, expect } from 'vitest'
import { ToolRegistry } from './tool-registry'
import type { ToolRegistration } from '../domain/agent.interfaces'
import type { ToolSchema } from '../domain/agent.types'

const makeTool = (name: string): ToolRegistration => ({
  schema: {
    name,
    description: `Tool ${name}`,
    inputSchema: { type: 'object', properties: {} },
    requiredCapabilities: [],
    riskLevel: 'READ_ONLY',
    timeoutMs: 5000,
    enabled: true,
  } satisfies ToolSchema,
  execute: async () => ({
    success: true,
    data: null,
    summary: `${name} executed`,
    error: null,
    durationMs: 0,
  }),
})

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry()
    const tool = makeTool('test_tool')
    registry.register(tool)

    expect(registry.has('test_tool')).toBe(true)
    expect(registry.get('test_tool')).toBe(tool)
  })

  it('returns false for unregistered tools', () => {
    const registry = new ToolRegistry()
    expect(registry.has('nonexistent')).toBe(false)
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('rejects duplicate registration', () => {
    const registry = new ToolRegistry()
    registry.register(makeTool('test'))
    expect(() => registry.register(makeTool('test'))).toThrow('already registered')
  })

  it('lists all registered tools', () => {
    const registry = new ToolRegistry()
    registry.register(makeTool('tool_a'))
    registry.register(makeTool('tool_b'))
    registry.register(makeTool('tool_c'))

    const list = registry.list()
    expect(list).toHaveLength(3)
  })

  it('returns schemas for all tools', () => {
    const registry = new ToolRegistry()
    registry.register(makeTool('alpha'))
    registry.register(makeTool('beta'))

    const schemas = registry.getSchemas()
    expect(schemas).toHaveLength(2)
    expect(schemas.map((s) => s.name)).toContain('alpha')
    expect(schemas.map((s) => s.name)).toContain('beta')
  })

  it('validates tool names', () => {
    const registry = new ToolRegistry()
    registry.register(makeTool('valid_tool'))

    expect(registry.validateToolName('valid_tool')).toBe(true)
    expect(registry.validateToolName('invalid_tool')).toBe(false)
  })
})
