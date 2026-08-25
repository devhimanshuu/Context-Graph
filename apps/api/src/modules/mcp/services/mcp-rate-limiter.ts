/* MCP rate limiter — per-session sliding window rate limiting.

Different tools can have different rate limits. Default limits are conservative
and can be overridden per tool. The rate limiter is stateless across restarts
(in-memory sliding window). Production should use Redis-backed implementation. */

import { Injectable } from '@nestjs/common'
import { IMcpRateLimiter } from '../domain/mcp.interfaces'

/** Default rate limits per tool per minute. */
const DEFAULT_TOOL_LIMITS: Record<string, { maxCalls: number; windowMs: number }> = {
  resolve_context: { maxCalls: 30, windowMs: 60_000 },
  get_subgraph: { maxCalls: 30, windowMs: 60_000 },
  get_run: { maxCalls: 60, windowMs: 60_000 },
  replay_run: { maxCalls: 10, windowMs: 60_000 },
}

interface WindowEntry {
  timestamps: number[]
}

@Injectable()
export class McpRateLimiter implements IMcpRateLimiter {
  private readonly windows = new Map<string, WindowEntry>()

  async check(
    sessionId: string,
    toolName: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const limits = DEFAULT_TOOL_LIMITS[toolName] ?? { maxCalls: 60, windowMs: 60_000 }
    const key = `${sessionId}:${toolName}`
    const now = Date.now()
    const windowStart = now - limits.windowMs

    let entry = this.windows.get(key)
    if (entry === undefined) {
      entry = { timestamps: [] }
      this.windows.set(key, entry)
    }

    // Prune old entries outside the window.
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    if (entry.timestamps.length >= limits.maxCalls) {
      const oldestInWindow = entry.timestamps[0]!
      const retryAfterMs = oldestInWindow + limits.windowMs - now
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) }
    }

    entry.timestamps.push(now)
    return { allowed: true }
  }

  /** Reset all windows (for testing). */
  reset(): void {
    this.windows.clear()
  }
}
