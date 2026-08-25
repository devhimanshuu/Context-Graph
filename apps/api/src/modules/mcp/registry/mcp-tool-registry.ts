/* MCP tool registry — central registration and discovery for MCP tools.

Only explicitly registered tools can be invoked. The registry is the
authorization boundary for tool access — unregistered tools cannot execute. */

import { Injectable } from '@nestjs/common'
import type { McpToolDefinition } from '@contextgraph/types'
import { IMcpTool, IMcpToolRegistry } from '../domain/mcp.interfaces'

@Injectable()
export class McpToolRegistry implements IMcpToolRegistry {
  private readonly tools = new Map<string, IMcpTool>()

  register(tool: IMcpTool): void {
    const name = tool.definition.name
    if (this.tools.has(name)) {
      throw new Error(`MCP tool '${name}' is already registered`)
    }
    this.tools.set(name, tool)
  }

  get(name: string): IMcpTool | undefined {
    return this.tools.get(name)
  }

  getAll(): readonly IMcpTool[] {
    return [...this.tools.values()]
  }

  getDefinitions(): readonly McpToolDefinition[] {
    return this.getAll().map((tool) => tool.definition)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }
}
