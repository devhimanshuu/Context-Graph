import { z } from 'zod'
import { slugSchema } from '@/validations/common/fields'
import { WORKSPACE_STATUS_VALUES } from '@/constants/domain'

export const createWorkspaceSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().min(1).max(255),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  status: z.enum(WORKSPACE_STATUS_VALUES).default('ACTIVE'),
})

export const updateWorkspaceSchema = createWorkspaceSchema.partial()

export type CreateWorkspaceSchema = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceSchema = z.infer<typeof updateWorkspaceSchema>
