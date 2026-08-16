import { z } from 'zod'

export const pipelineRunListSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PipelineRunListInput = z.infer<typeof pipelineRunListSchema>
