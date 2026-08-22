/* Tool registry — register, discover, validate, retrieve tools. */

import { Injectable } from '@nestjs/common'
import type { ToolSchema } from '../domain/agent.types'
import { IToolRegistry, type ToolRegistration } from '../domain/agent.interfaces'

/**
 * Only explicitly registered tools can execute.
 * The registry is the single source of truth for available tools.
 */
@Injectable()
export class ToolRegistry implements IToolRegistry {
  private readonly tools = new Map<string, ToolRegistration>()

  register(tool: ToolRegistration): void {
    if (this.tools.has(tool.schema.name)) {
      throw new Error(`Tool already registered: ${tool.schema.name}`)
    }
    this.tools.set(tool.schema.name, tool)
  }

  get(name: string): ToolRegistration | undefined {
    return this.tools.get(name)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  list(): readonly ToolRegistration[] {
    return [...this.tools.values()]
  }

  getSchemas(): readonly ToolSchema[] {
    return [...this.tools.values()].map((t) => t.schema)
  }

  validateToolName(name: string): boolean {
    return this.tools.has(name)
  }
}
