import type { EntityId } from "@contextgraph/types";

/** Normalized pagination parameters accepted by every list endpoint. */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Metadata accompanying every paginated response. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** A paginated result set. */
export interface Paginated<T> {
  items: readonly T[];
  meta: PaginationMeta;
}

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/** Normalized sort parameters. */
export interface SortParams {
  field: string;
  direction: SortDirection;
}

/** Normalized generic filter expression (extended by the filtering pipe). */
export interface FilterParams {
  [field: string]: unknown;
}

/* Entity-scoped pagination: forces tenant isolation at the repository */
export interface OrgScopedPaginationParams extends PaginationParams {
  organizationId: EntityId;
}
