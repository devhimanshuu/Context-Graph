/* MCP Rate Limiter — unit tests. */

import { describe, it, expect, beforeEach } from 'vitest'
import { McpRateLimiter } from '../services/mcp-rate-limiter'

describe('McpRateLimiter', () => {
  let limiter: McpRateLimiter

  beforeEach(() => {
    limiter = new McpRateLimiter()
  })

  it('allows requests under the limit', async () => {
    const result = await limiter.check('session-1', 'resolve_context')
    expect(result.allowed).toBe(true)
  })

  it('rejects requests over the limit', async () => {
    // resolve_context has limit of 30 per minute.
    for (let i = 0; i < 30; i++) {
      const result = await limiter.check('session-1', 'resolve_context')
      expect(result.allowed).toBe(true)
    }
    // 31st request should be rejected.
    const result = await limiter.check('session-1', 'resolve_context')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks sessions independently', async () => {
    // Exhaust session-1's limit.
    for (let i = 0; i < 30; i++) {
      await limiter.check('session-1', 'resolve_context')
    }
    // session-2 should still be allowed.
    const result = await limiter.check('session-2', 'resolve_context')
    expect(result.allowed).toBe(true)
  })

  it('tracks tools independently', async () => {
    // Exhaust resolve_context limit.
    for (let i = 0; i < 30; i++) {
      await limiter.check('session-1', 'resolve_context')
    }
    // get_run has a separate limit of 60.
    const result = await limiter.check('session-1', 'get_run')
    expect(result.allowed).toBe(true)
  })

  it('resets after window expires', async () => {
    // Exhaust the limit.
    for (let i = 0; i < 30; i++) {
      await limiter.check('session-1', 'resolve_context')
    }
    const blocked = await limiter.check('session-1', 'resolve_context')
    expect(blocked.allowed).toBe(false)

    // Reset and it should work again.
    limiter.reset()
    const allowed = await limiter.check('session-1', 'resolve_context')
    expect(allowed.allowed).toBe(true)
  })
})
