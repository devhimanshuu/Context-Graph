import { Injectable } from '@nestjs/common'
import { IRuleCache } from './rule-cache.interface'

interface CacheEntry {
  readonly value: unknown
  readonly expiresAt: number | null
}

/** Simple in-memory cache with TTL — the default binding for IRuleCache. */
@Injectable()
export class InMemoryRuleCache extends IRuleCache {
  private readonly store = new Map<string, CacheEntry>()

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key)
    if (entry === undefined) return undefined
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs === undefined ? null : Date.now() + ttlMs,
    })
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key)
  }
}
