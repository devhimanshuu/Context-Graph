import { z } from 'zod'
import { Industry, OrganizationStatus } from '@contextgraph/types'

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
  industry: z.nativeEnum(Industry),
  status: z.nativeEnum(OrganizationStatus).default(OrganizationStatus.ONBOARDING),
  configuration: z.record(z.string(), z.unknown()).default({}),
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

export const organizationIdSchema = z.string().uuid()

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
