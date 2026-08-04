import { z } from 'zod'
import { API } from '@/constants/api'

/**
 * Reusable pagination query schema.
 *
 * Coerces query-string values (`page`, `pageSize`) into integers with sane
 * bounds, so every list endpoint paginates consistently by construction.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(API.maxPageSize).default(API.defaultPageSize),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
