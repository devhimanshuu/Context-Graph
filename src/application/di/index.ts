import { Container } from './container'
import { applicationProviders, registerProviders } from './providers'

/**
 * Dependency injection — import from `@/application/di`.
 */
export type { ServiceToken } from './tokens'
export { createToken } from './tokens'
export type { ServiceFactory } from './factories'
export type { ServiceRegistry } from './registry'
export type { ServiceResolver } from './resolver'
export { Container } from './container'
export type { Provider } from './providers'
export { registerProviders } from './providers'

/**
 * The root application container. Providers register here once at bootstrap;
 * application code resolves services from it. Deliberately empty until
 * Phase 4 registers the first implementations — an unbound `resolve()` is a
 * loud `ConfigurationError` instead of a silent `undefined`.
 */
export const container = new Container()
registerProviders(container, applicationProviders)
