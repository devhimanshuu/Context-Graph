/** The cache namespaces owned by the application layer. */
export const CACHE_NAMESPACES = ['PERMISSION', 'TRAVERSAL', 'NODE', 'CANDIDATE'] as const

export type CacheNamespace = (typeof CACHE_NAMESPACES)[number]

/** Fully-qualified cache key (namespace-prefixed). */
export type CacheKey = string

/** Builds a namespace-prefixed key — the only way keys are created. */
export function createCacheKey(
  namespace: CacheNamespace,
  parts: readonly (string | number)[],
): CacheKey {
  return `${namespace}:${parts.join(':')}`
}

/**
 * Typed key builders per namespace — the cache vocabulary of the application
 * layer. Centralizing them keeps key formats stable (a cache format change is
 * a one-file change, and old keys are naturally invalidated).
 */
export const CacheKeys = {
  permission: (userId: string, organizationId: string, workspaceId: string | null) =>
    createCacheKey('PERMISSION', [organizationId, workspaceId ?? 'org', userId]),
  traversal: (
    organizationId: string,
    workspaceId: string,
    entryNodeIds: readonly string[],
    maxDepth: number,
  ) => createCacheKey('TRAVERSAL', [organizationId, workspaceId, ...entryNodeIds, maxDepth]),
  node: (nodeId: string) => createCacheKey('NODE', [nodeId]),
  candidate: (requestId: string) => createCacheKey('CANDIDATE', [requestId]),
} as const
