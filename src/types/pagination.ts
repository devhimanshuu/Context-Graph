/**
 * Pagination contracts shared by the repository, service and HTTP layers so
 * every list operation paginates identically by construction.
 */

/** Sort direction — always spelled out; never magic strings. */
export type SortDirection = 'asc' | 'desc'

/** A single sortable field + direction. */
export interface SortOption {
  field: string
  direction: SortDirection
}

/** Raw pagination parameters accepted by repository layers. */
export interface PageParams {
  page: number
  pageSize: number
}

/** Pagination parameters plus optional ordering. */
export interface PageQuery extends PageParams {
  sort?: SortOption[]
}

/** Paginated result shape returned by repository layers. */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * Application-layer alias of `PageResult` — the canonical pagination contract.
 * `Paginated<T>` exists so application services and use cases can name the
 * shape without importing the repository vocabulary.
 */
export type Paginated<T> = PageResult<T>

/** Derived metadata for API responses. */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Converts a repository result into response metadata. */
export function toPaginationMeta(result: PageResult<unknown>): PaginationMeta {
  const totalPages = result.pageSize === 0 ? 0 : Math.ceil(result.total / result.pageSize)
  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages,
    hasNextPage: result.page < totalPages,
    hasPreviousPage: result.page > 1,
  }
}
