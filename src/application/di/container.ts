import { ConfigurationError } from '@/application/errors'
import { type ServiceFactory } from './factories'
import { type ServiceRegistry } from './registry'
import { type ServiceResolver } from './resolver'
import { type ServiceToken } from './tokens'

/**
 * The application service container.
 *
 * Implements the registry + resolver contracts with singleton semantics:
 * each token resolves to one lazily-constructed instance per container.
 * Dependencies are expressed as factories receiving the container, which
 * keeps the graph fully declarative and replaceable — swapping an
 * implementation is a one-line provider change, and no application code
 * changes.
 *
 * NOTE: `unknown` is used internally for the maps and narrowed to `T` at the
 * boundary — the container is the one place generic variance is erased, by
 * design.
 */
export class Container implements ServiceRegistry, ServiceResolver {
  private readonly factories = new Map<ServiceToken<unknown>, ServiceFactory<unknown>>()
  private readonly instances = new Map<ServiceToken<unknown>, unknown>()

  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    const key = token as ServiceToken<unknown>
    if (this.factories.has(key)) {
      throw new ConfigurationError(`Service token "${token.name}" is already registered`)
    }
    this.factories.set(key, factory as ServiceFactory<unknown>)
  }

  has(token: ServiceToken<unknown>): boolean {
    return this.factories.has(token)
  }

  resolve<T>(token: ServiceToken<T>): T {
    const key = token as ServiceToken<unknown>
    const factory = this.factories.get(key)
    if (factory === undefined) {
      throw new ConfigurationError(
        `No provider registered for service token "${token.name}". ` +
          'Register it via registerProviders() at bootstrap.',
      )
    }

    let instance = this.instances.get(key)
    if (instance === undefined) {
      instance = factory(this)
      this.instances.set(key, instance)
    }
    return instance as T
  }
}
