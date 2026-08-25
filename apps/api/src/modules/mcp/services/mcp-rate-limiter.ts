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

  /** Last time a full sweep evicted stale windows (avoids sweeping per request). */
  private lastSweepAt = 0

  /** Sweep interval — one full-map eviction pass per default window. */
  private static readonly SWEEP_INTERVAL_MS = 60_000

  async check(
    sessionId: string,
    toolName: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const limits = DEFAULT_TOOL_LIMITS[toolName] ?? { maxCalls: 60, windowMs: 60_000 }
    const key = `${sessionId}:${toolName}`
    const now = Date.now()
    const windowStart = now - limits.windowMs

    this.sweepIfDue(now, limits.windowMs)

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

  /**
   * Evict windows for sessions that have gone silent, so idle sessions do not
   * accumulate forever. Runs at most once per sweep interval.
   */
  private sweepIfDue(now: number, windowMs: number): void {
    if (now - this.lastSweepAt < McpRateLimiter.SWEEP_INTERVAL_MS) {
      return
    }
    this.lastSweepAt = now

    const cutoff = now - Math.max(windowMs, McpRateLimiter.SWEEP_INTERVAL_MS)
    for (const [key, entry] of this.windows) {
      // Keep only entries with at least one timestamp still inside the window.
      const latest = entry.timestamps[entry.timestamps.length - 1]
      if (latest === undefined || latest <= cutoff) {
        this.windows.delete(key)
      }
    }
  }

  /** Reset all windows (for testing). */
  reset(): void {
    this.windows.clear()
  }
}
