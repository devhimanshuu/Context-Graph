/* Agent validation schemas — Zod schemas for request validation. */

import { z } from 'zod'

export const runAgentRequestSchema = z.object({
  userRequest: z.string().min(1, 'User request is required').max(10_000, 'User request too long'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  entryContext: z.record(z.string(), z.unknown()).optional(),
  modelProvider: z.string().max(100).optional(),
  modelName: z.string().max(200).optional(),
})

export type RunAgentRequestValidated = z.infer<typeof runAgentRequestSchema>

export const executionParamsSchema = z.object({
  id: z.string().uuid('Invalid execution ID'),
})

export const executionQuerySchema = z.object({
  includeSteps: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  includeToolCalls: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  includeObservations: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  includeVerifications: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const now = new Date().toISOString()

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().default(thirtyDaysAgo),
  to: z.string().datetime().default(now),
})

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).optional(),
})
