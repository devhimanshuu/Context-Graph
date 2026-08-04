/**
 * Shared application-wide types (domain-agnostic).
 *
 * - Pagination contracts: `src/types/pagination.ts`
 * - Generic utility/mapped types: `src/types/utility.ts`
 * - API response shapes: `src/types/api.ts`
 *
 * Domain entity interfaces live in `src/domain/models` (the canonical domain
 * contract); this module hosts cross-layer generics.
 */
export type {
  PageParams,
  PageResult,
  PageQuery,
  Paginated,
  SortDirection,
  SortOption,
  PaginationMeta,
} from './pagination'
export { toPaginationMeta } from './pagination'
export type {
  EntityId,
  JsonValue,
  Maybe,
  Optional,
  Nullable,
  Timestamp,
  DeepReadonly,
  DeepPartial,
  RequireAtLeastOne,
  EntityCreateInput,
  EntityUpdateInput,
  Result,
} from './utility'
export { ok, err } from './utility'
export type { PaginatedApiData } from './api'
