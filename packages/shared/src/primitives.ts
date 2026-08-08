/** T or undefined (explicitly present but maybe absent). */
export type Optional<T> = T | undefined;

/** T or null (JSON-serializable absence). */
export type Nullable<T> = T | null;

/** Recursively freezes an object graph at the type level. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Union of all values of an object type. */
export type ValueOf<T> = T[keyof T];

/** Keys of T whose values are strings. */
export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

/** Converts a union of object types into an intersection (e.g. mixin results). */
export type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;
