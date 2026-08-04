import { type Container } from './container'

/**
 * A service factory: given the container (for transitive dependency
 * resolution), produce the service instance.
 */
export type ServiceFactory<T> = (container: Container) => T
