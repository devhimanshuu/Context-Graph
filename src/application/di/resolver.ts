import { type ServiceToken } from './tokens'

/**
 * Resolution contract of the DI container. `resolve` returns the instance
 * bound to the token, lazily constructing it on first use (singleton
 * semantics). An unbound token is a `ConfigurationError` — misconfiguration
 * surfaces at the first call, not silently.
 */
export interface ServiceResolver {
  resolve<T>(token: ServiceToken<T>): T
}
