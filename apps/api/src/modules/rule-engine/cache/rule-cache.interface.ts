/** DI token for the rule cache. */
export const RULE_CACHE = Symbol('IRuleCache')

/**
 * Cache seam for the rule engine. Future implementations may back rule
 * configuration, derivability metadata and compiled pipelines with Redis or
 * a shared cache; the engine only depends on this contract.
 */
export abstract class IRuleCache {
  abstract get<T>(key: string): Promise<T | undefined>
  abstract set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  abstract invalidate(key: string): Promise<void>
}
