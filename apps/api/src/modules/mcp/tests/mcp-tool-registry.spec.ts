/* MCP Tool Registry — unit tests. */

import { describe, it, expect, beforeEach } from 'vitest'
import { McpToolRegistry } from '../registry/mcp-tool-registry'
import type { IMcpTool } from '../domain/mcp.interfaces'
import type { McpSession, McpToolResult } from '@contextgraph/types'

function createMockTool(name: string): IMcpTool {
  return {
    definition: {
      name,
      description: `Test tool: ${name}`,
      requiredCapabilities: [],
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
    },
    async execute(
      _session: McpSession,
      _input: Record<string, unknown>,
      requestId: string,
    ): Promise<McpToolResult> {
      return {
        toolCallId: requestId,
        toolName: name,
        status: 'success',
        data: { result: 'ok' },
        metadata: {
          executionTimeMs: 0,
          organizationId: 'org-1',
          principalId: 'user-1',
          timestamp: new Date().toISOString(),
        },
      }
    },
  }
}

describe('McpToolRegistry', () => {
  let registry: McpToolRegistry

  beforeEach(() => {
    registry = new McpToolRegistry()
  })

  it('registers and retrieves a tool', () => {
    const tool = createMockTool('test_tool')
    registry.register(tool)
    expect(registry.has('test_tool')).toBe(true)
    expect(registry.get('test_tool')).toBe(tool)
  })

  it('returns undefined for unregistered tools', () => {
    expect(registry.has('nonexistent')).toBe(false)
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('throws on duplicate registration', () => {
    const tool = createMockTool('test_tool')
    registry.register(tool)
    expect(() => registry.register(tool)).toThrow('already registered')
  })

  it('returns all registered tools', () => {
    const tool1 = createMockTool('tool_1')
    const tool2 = createMockTool('tool_2')
    registry.register(tool1)
    registry.register(tool2)
    expect(registry.getAll()).toHaveLength(2)
  })

  it('returns tool definitions', () => {
    const tool = createMockTool('resolve_context')
    registry.register(tool)
    const defs = registry.getDefinitions()
    expect(defs).toHaveLength(1)
    expect(defs[0].name).toBe('resolve_context')
  })
})
