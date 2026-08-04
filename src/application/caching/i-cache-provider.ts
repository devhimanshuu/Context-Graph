/**
 * Generic cache provider contract.
 *
 * Implementations are interchangeable (in-memory today, Redis / Upstash for
 * production) and are bound in the DI container. Keys are fully-qualified by
 * `createCacheKey` (namespace-prefixed) so the same provider can back
 * permission, traversal, node and candidate caches without collisions.
 */
export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  has(key: string): Promise<boolean>
}
