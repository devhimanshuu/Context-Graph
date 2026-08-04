/**
 * Generic utility and mapped types used across all layers.
 */

/** Every primary key is a UUID string. */
export type EntityId = string

/** JSON-compatible value (mirrors what Postgres `Json` columns accept). */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/** Maybe: the value or null or undefined. */
export type Maybe<T> = T | null | undefined

/** Optional: the value or undefined (application-layer update semantics). */
export type Optional<T> = T | undefined

/** Nullable: the value or null (database NULL semantics). */
export type Nullable<T> = T | null

/**
 * ISO-8601 timestamp used on the wire (DTOs, events). Domain models use
 * `Date`; mappers convert at the boundary.
 */
export type Timestamp = string

/**
 * Deep readonly: recurses into objects and arrays so entire contract trees can
 * be frozen at the type level (e.g. pipeline contexts handed to stages).
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyArray<unknown>
    ? DeepReadonlyArray<T[number]>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>

/** Deep partial: recurses into objects and arrays. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** Requires at least one of the given keys to be present. */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/**
 * Input types derived from a domain entity — a mapped type that strips
 * store-managed fields so create/update contracts can never drift from the
 * entity shape.
 *
 * NOTE: `organizationId` is intentionally NOT stripped — it is caller-supplied
 * (multi-tenancy is explicit at every write), unlike id/timestamps which the
 * store manages. `version` is stripped because it is bumped by the store.
 */
export type EntityCreateInput<T> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdById' | 'updatedById' | 'version'
>

/** Update contract: any subset of the create contract. */
export type EntityUpdateInput<T> = Partial<EntityCreateInput<T>>

/**
 * Result monad for operations that may fail without throwing (e.g. future
 * repository implementations returning recoverable outcomes).
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
