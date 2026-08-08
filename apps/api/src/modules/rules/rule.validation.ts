import { z } from 'zod'
import { ContextRuleStatus } from '@contextgraph/types'

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  condition: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()).default({}),
  priority: z.number().int().default(0),
  status: z.nativeEnum(ContextRuleStatus).default(ContextRuleStatus.DRAFT),
  isEnabled: z.boolean().default(false),
})

export const updateRuleSchema = createRuleSchema.partial()

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
