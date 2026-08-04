import { type Container } from './container'
import { type ServiceFactory } from './factories'
import { type ServiceToken } from './tokens'

/**
 * A provider is a declarative binding: token + factory (+ optional scope
 * metadata). Providers are the only thing that changes when swapping
 * implementations (e.g. BFS → A* traversal, memory → Redis cache).
 */
export interface Provider<T = unknown> {
  token: ServiceToken<T>
  factory: ServiceFactory<T>
  /**
   * `singleton` (default) — one instance per container, resolved lazily.
   * `transient` — a fresh instance per resolve; honored by future async/scope
   * extensions of the container (documented, not yet enforced).
   */
  scope?: 'singleton' | 'transient'
}

/** Registers a list of providers, failing fast on duplicate tokens. */
export function registerProviders(container: Container, providers: readonly Provider[]): void {
  for (const provider of providers) {
    container.register(provider.token, provider.factory)
  }
}

/**
 * The application provider bindings.
 *
 * Filled in as service implementations land (Phase 4+), e.g.:
 *
 *   export const applicationProviders = [
 *     { token: TOKENS.graphTraversalService, factory: () => new BFSTraversal(...) },
 *     ...
 *   ]
 *
 * Until then the container is intentionally empty — an unbound resolve() is a
 * loud ConfigurationError instead of a silent undefined.
 */
export const applicationProviders: readonly Provider[] = []
