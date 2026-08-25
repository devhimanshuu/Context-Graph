/* MCP observability — tracks tool calls, latency, errors, and denials. */

import { Injectable } from '@nestjs/common'
import { IMcpObservability } from '../domain/mcp.interfaces'

interface ToolMetrics {
  totalCalls: number
  successes: number
  failures: number
  totalLatencyMs: number
  authDenials: number
  rateLimits: number
}

@Injectable()
export class McpObservability implements IMcpObservability {
  private readonly metrics = new Map<string, ToolMetrics>()

  recordToolCall(toolName: string, success: boolean, latencyMs: number): void {
    const m = this.getOrCreate(toolName)
    m.totalCalls += 1
    m.totalLatencyMs += latencyMs
    if (success) {
      m.successes += 1
    } else {
      m.failures += 1
    }
  }

  recordAuthDenial(toolName: string): void {
    this.getOrCreate(toolName).authDenials += 1
  }

  recordRateLimit(toolName: string): void {
    this.getOrCreate(toolName).rateLimits += 1
  }

  recordError(toolName: string, _errorType: string): void {
    this.getOrCreate(toolName).failures += 1
  }

  getMetrics(toolName: string): ToolMetrics | undefined {
    return this.metrics.get(toolName)
  }

  getAllMetrics(): ReadonlyMap<string, ToolMetrics> {
    return this.metrics
  }

  private getOrCreate(toolName: string): ToolMetrics {
    let m = this.metrics.get(toolName)
    if (m === undefined) {
      m = {
        totalCalls: 0,
        successes: 0,
        failures: 0,
        totalLatencyMs: 0,
        authDenials: 0,
        rateLimits: 0,
      }
      this.metrics.set(toolName, m)
    }
    return m
  }
}
