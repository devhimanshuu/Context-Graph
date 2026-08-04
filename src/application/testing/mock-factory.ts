/**
 * Framework-agnostic test double factory.
 *
 * Creates a Proxy-backed object typed as `T`. Behaviour is supplied via
 * `overrides` (or the per-interface defaults in `mocks.ts`); any property
 * accessed that was never configured throws at the call site — surfacing
 * missing test doubles immediately instead of returning `undefined` and
 * producing confusing failures.
 *
 * Works with any test runner (vitest, jest, node:test) — no framework
 * dependency.
 */
export function createMock<T extends object>(overrides: Partial<T> = {}): T {
  return new Proxy(overrides, {
    get(target, prop) {
      if (prop in target) {
        return Reflect.get(target, prop)
      }
      if (typeof prop === 'symbol') {
        return undefined
      }
      return () => {
        throw new Error(
          `Mock "${String(prop)}" is not configured. ` +
            'Pass an override (or a per-interface default in mocks.ts) to createMock.',
        )
      }
    },
  }) as T
}
