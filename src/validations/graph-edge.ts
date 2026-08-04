import { z } from 'zod'
import { jsonObjectSchema, optionalIsoDateTimeSchema } from '@/validations/common/fields'
import { RELATIONSHIP_TYPE_VALUES } from '@/constants/domain'

/**
 * Shared invariant: a node cannot relate to itself. Guarded for partial
 * updates (either field may be undefined).
 */
const selfReferenceRule = (v: { sourceId?: string; targetId?: string }): boolean =>
  v.sourceId == null || v.targetId == null || v.sourceId !== v.targetId

// Zod 4 note: `.partial()` cannot run on a refined schema, so the object
// shape is defined once and both the create and update contracts apply the
// same refine afterwards.
const graphEdgeObjectSchema = z.object({
  organizationId: z.uuid(),
  workspaceId: z.uuid(),
  sourceId: z.uuid(),
  targetId: z.uuid(),
  relationshipType: z.enum(RELATIONSHIP_TYPE_VALUES),
  /** Traversal weight 0-1; default 1 (full strength). */
  weight: z.number().min(0).max(1).default(1),
  validFrom: optionalIsoDateTimeSchema,
  validTo: optionalIsoDateTimeSchema,
  metadata: jsonObjectSchema.default({}),
})

export const createGraphEdgeSchema = graphEdgeObjectSchema.refine(selfReferenceRule, {
  message: 'sourceId and targetId must differ',
  path: ['targetId'],
})

export const updateGraphEdgeSchema = graphEdgeObjectSchema.partial().refine(selfReferenceRule, {
  message: 'sourceId and targetId must differ',
  path: ['targetId'],
})

export type CreateGraphEdgeSchema = z.infer<typeof createGraphEdgeSchema>
export type UpdateGraphEdgeSchema = z.infer<typeof updateGraphEdgeSchema>
