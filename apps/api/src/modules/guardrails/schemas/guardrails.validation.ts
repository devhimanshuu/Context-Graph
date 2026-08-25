/* Guardrails input schemas — strict Zod validation for action check requests. */

import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format')

export const actionCheckSchema = z.object({
  action: z.string().min(1, 'Action is required').max(100, 'Action too long'),
  targetType: z.string().min(1, 'Target type is required').max(100, 'Target type too long'),
  targetId: uuidSchema.nullable().optional().default(null),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
  purpose: z.string().max(1_000, 'Purpose too long').nullable().optional().default(null),
})

export type ActionCheckInput = z.infer<typeof actionCheckSchema>

export const guardrailQuerySchema = z.object({
  action: z.string().optional(),
  decision: z.enum(['ALLOW', 'DENY', 'REQUIRES_APPROVAL', 'ERROR']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export type GuardrailQueryInput = z.infer<typeof guardrailQuerySchema>
