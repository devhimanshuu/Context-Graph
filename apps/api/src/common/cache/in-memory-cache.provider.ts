import { Injectable } from '@nestjs/common'
import type { ICacheProvider } from '../interfaces/cache-provider.interface'

interface CacheEntry {
  value: unknown
  expiresAt: number | null
}

/* TTL-aware in-memory cache. Default binding until Redis is provisioned; */
@Injectable()
export class InMemoryCacheProvider implements ICacheProvider {
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

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async flush(): Promise<void> {
    this.store.clear()
  }
}
