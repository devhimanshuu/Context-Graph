import { describe, expect, it, vi } from 'vitest'
import { InMemoryRuleCache } from './in-memory-rule-cache'

describe('InMemoryRuleCache', () => {
  it('stores and retrieves values', async () => {
    const cache = new InMemoryRuleCache()
    await cache.set('a', { value: 1 })
    await expect(cache.get('a')).resolves.toEqual({ value: 1 })
  })

  it('returns undefined for unknown keys', async () => {
    const cache = new InMemoryRuleCache()
    await expect(cache.get('missing')).resolves.toBeUndefined()
  })

  it('invalidates keys', async () => {
    const cache = new InMemoryRuleCache()
    await cache.set('a', 1)
    await cache.invalidate('a')
    await expect(cache.get('a')).resolves.toBeUndefined()
  })

  it('expires entries after the TTL', async () => {
    vi.useFakeTimers()
    try {
      const cache = new InMemoryRuleCache()
      await cache.set('a', 1, 100)
      vi.advanceTimersByTime(50)
      await expect(cache.get('a')).resolves.toBe(1)
      vi.advanceTimersByTime(60)
      await expect(cache.get('a')).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps entries alive indefinitely without a TTL', async () => {
    vi.useFakeTimers()
    try {
      const cache = new InMemoryRuleCache()
      await cache.set('a', 1)
      vi.advanceTimersByTime(60_000)
      await expect(cache.get('a')).resolves.toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
