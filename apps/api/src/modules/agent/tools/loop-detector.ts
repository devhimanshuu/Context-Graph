/* Loop detector — identifies repetitive identical tool calls. */

import { Injectable } from '@nestjs/common'
import { ILoopDetector } from '../domain/agent.interfaces'

/**
 * Tracks recent tool calls and detects if the same tool+input combination
 * is being repeated beyond the threshold.
 */
@Injectable()
export class LoopDetector implements ILoopDetector {
  private readonly recentCalls = new Map<string, { count: number; lastSeen: number }>()

  record(toolName: string, input: Record<string, unknown>): void {
    const key = this.makeKey(toolName, input)
    const existing = this.recentCalls.get(key)
    if (existing !== undefined) {
      this.recentCalls.set(key, { count: existing.count + 1, lastSeen: Date.now() })
    } else {
      this.recentCalls.set(key, { count: 1, lastSeen: Date.now() })
    }
  }

  isLooping(toolName: string, input: Record<string, unknown>, threshold: number): boolean {
    const key = this.makeKey(toolName, input)
    const existing = this.recentCalls.get(key)
    if (existing === undefined) return false
    return existing.count >= threshold
  }

  reset(_executionId?: string): void {
    // Reset all tracking for this execution
    this.recentCalls.clear()
  }

  private makeKey(toolName: string, input: Record<string, unknown>): string {
    // Sort keys for deterministic hashing
    const sorted = Object.keys(input)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = input[key]
          return acc
        },
        {} as Record<string, unknown>,
      )
    return `${toolName}::${JSON.stringify(sorted)}`
  }
}
