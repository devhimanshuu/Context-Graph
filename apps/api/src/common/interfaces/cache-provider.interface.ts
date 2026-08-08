/* Cache contract. The common module binds InMemoryCacheProvider; swapping in */
export interface ICacheProvider {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  del(key: string): Promise<void>
  flush(): Promise<void>
}

/** DI token for the cache provider. */
export const CACHE_PROVIDER = Symbol('ICacheProvider')
