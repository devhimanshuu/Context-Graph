import type { PaginationMeta } from '@/types/pagination'

/**
 * API-level response contracts. The envelope itself lives in
 * `src/dto/api-response.dto.ts`; these types extend it for collections.
 */

/** Data payload for paginated list endpoints. */
export interface PaginatedApiData<T> {
  items: T[]
  pagination: PaginationMeta
}
