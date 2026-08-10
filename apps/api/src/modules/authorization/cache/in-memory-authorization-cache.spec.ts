import { describe, expect, it, vi } from 'vitest'
import { InMemoryAuthorizationCache } from './in-memory-authorization-cache'
import { ORG_A, ORG_B, makeContext } from '../testing/authorization-fixtures'

const contextA = makeContext({ userId: 'u-1', organizationId: ORG_A })
const contextB = makeContext({ userId: 'u-2', organizationId: ORG_B })

describe('InMemoryAuthorizationCache', () => {
  it('round-trips a compiled context', async () => {
    const cache = new InMemoryAuthorizationCache()
    await cache.set('u-1', contextA)
    await expect(cache.get('u-1')).resolves.toBe(contextA)
  })

  it('expires entries after their TTL (bounds staleness)', async () => {
    vi.useFakeTimers()
    try {
      const cache = new InMemoryAuthorizationCache()
      await cache.set('u-1', contextA, 100)
      await expect(cache.get('u-1')).resolves.toBe(contextA)
      vi.advanceTimersByTime(101)
      await expect(cache.get('u-1')).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('invalidates a single principal', async () => {
    const cache = new InMemoryAuthorizationCache()
    await cache.set('u-1', contextA)
    await cache.set('u-2', contextB)
    await cache.invalidate('u-1')
    await expect(cache.get('u-1')).resolves.toBeUndefined()
    await expect(cache.get('u-2')).resolves.toBe(contextB)
  })

  it('invalidates every principal of a tenant', async () => {
    const cache = new InMemoryAuthorizationCache()
    await cache.set('u-1', contextA)
    await cache.set('u-3', makeContext({ userId: 'u-3', organizationId: ORG_A }))
    await cache.set('u-2', contextB)
    await cache.invalidateOrganization(ORG_A)
    await expect(cache.get('u-1')).resolves.toBeUndefined()
    await expect(cache.get('u-3')).resolves.toBeUndefined()
    await expect(cache.get('u-2')).resolves.toBe(contextB)
  })

  it('flushes everything', async () => {
    const cache = new InMemoryAuthorizationCache()
    await cache.set('u-1', contextA)
    await cache.set('u-2', contextB)
    await cache.flush()
    await expect(cache.get('u-1')).resolves.toBeUndefined()
    await expect(cache.get('u-2')).resolves.toBeUndefined()
  })
})
