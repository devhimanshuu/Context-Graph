/**
 * Dependency-injection tokens.
 *
 * A token is an opaque, branded identifier for a service contract. The
 * phantom type `T` exists only at compile time; at runtime a token is a name
 * + unique symbol, so structurally identical tokens from different modules
 * never collide.
 */
export interface ServiceToken<T> {
  readonly name: string
  readonly __brand: unique symbol
  readonly __phantom?: T
}

/** Creates a strongly typed service token. */
export function createToken<T>(name: string): ServiceToken<T> {
  return { name, __brand: Symbol(name) } as unknown as ServiceToken<T>
}
