import { z } from 'zod'
import { jsonObjectSchema, slugSchema } from '@/validations/common/fields'
import { INDUSTRY_VALUES, ORGANIZATION_STATUS_VALUES } from '@/constants/domain'

/**
 * Organization create/update contracts. Consumed by future API route
 * handlers; the resulting DTOs are `z.infer` types exported from `src/dto`.
 */

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  industry: z.enum(INDUSTRY_VALUES),
  status: z.enum(ORGANIZATION_STATUS_VALUES).default('ONBOARDING'),
  configuration: jsonObjectSchema.default({}),
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>
