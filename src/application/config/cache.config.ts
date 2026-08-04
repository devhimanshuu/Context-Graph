/**
 * Strongly typed cache configuration.
 *
 * `provider` drives which `ICacheProvider` implementation is bound in the DI
 * container: MEMORY (dev/test) → REDIS / UPSTASH (production).
 */
export interface CacheConfig {
  provider: 'MEMORY' | 'REDIS' | 'UPSTASH'
  defaultTtlSeconds: number
  /** Safety cap on serialized value size. */
  maxKeySizeBytes: number
}
