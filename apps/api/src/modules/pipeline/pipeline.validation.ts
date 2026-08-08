import { z } from 'zod'

export const pipelineRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  context: z.record(z.string(), z.unknown()).default({}),
  maxDepth: z.number().int().min(1).max(64).default(32),
})

export type PipelineRequestInput = z.infer<typeof pipelineRequestSchema>
