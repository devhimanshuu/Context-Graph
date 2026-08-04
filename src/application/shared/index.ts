/**
 * Application shared types — import from `@/application/shared`.
 *
 * The generic contracts (`Result`, `Paginated`, `Optional`, `Nullable`,
 * `DeepReadonly`, `EntityId`, `Timestamp`) are defined once in `@/types` —
 * the canonical cross-layer home — and re-exported here so application-layer
 * modules name their imports from the application surface without duplicating
 * a single contract.
 */
export type {
  Result,
  Paginated,
  Optional,
  Nullable,
  DeepReadonly,
  EntityId,
  Timestamp,
} from '@/types'
export { ok, err } from '@/types'
