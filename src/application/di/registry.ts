import { type ServiceFactory } from './factories'
import { type ServiceToken } from './tokens'

/**
 * Registration contract of the DI container: binds tokens to factories.
 * Implementations are expected to throw `ConfigurationError` when a token is
 * registered twice (fail-fast on ambiguous bindings).
 */
export interface ServiceRegistry {
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void
  has(token: ServiceToken<unknown>): boolean
}
