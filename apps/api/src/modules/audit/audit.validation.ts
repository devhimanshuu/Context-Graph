import { z } from 'zod'
import type { AuditEntityType } from '@contextgraph/types'

export const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const AUDIT_ENTITY_TYPES: readonly AuditEntityType[] = [
  'ORGANIZATION',
  'WORKSPACE',
  'DEPARTMENT',
  'USER',
  'KNOWLEDGE_NODE',
  'GRAPH_EDGE',
  'PERMISSION_PROFILE',
  'CONTEXT_RULE',
]

export type AuditQueryInput = z.infer<typeof auditQuerySchema>
