import { z } from 'zod'
import { jsonObjectSchema, optionalIsoDateTimeSchema } from '@/validations/common/fields'
import { COMPLIANCE_TAG_VALUES, NODE_STATUS_VALUES, NODE_TYPE_VALUES } from '@/constants/domain'

/**
 * Shared validity-window invariant: validTo must be after validFrom when both
 * are present. Guarded for partial updates (either field may be undefined).
 */
const validityRule = (v: { validFrom?: string | null; validTo?: string | null }): boolean =>
  v.validFrom == null ||
  v.validTo == null ||
  new Date(v.validTo).getTime() > new Date(v.validFrom).getTime()

// Zod 4 note: `.partial()` cannot run on a refined schema, so the object
// shape is defined once and both the create and update contracts apply the
// same refine afterwards.
const knowledgeNodeObjectSchema = z.object({
  organizationId: z.uuid(),
  workspaceId: z.uuid(),
  departmentId: z.uuid().nullish(),
  title: z.string().min(1).max(500),
  content: z.string().max(100_000),
  type: z.enum(NODE_TYPE_VALUES),
  status: z.enum(NODE_STATUS_VALUES).default('DRAFT'),
  /** Retrieval importance 0-100. */
  importance: z.number().int().min(0).max(100).default(0),
  /** Derivability confidence 0-100. */
  derivabilityScore: z.number().int().min(0).max(100).default(0),
  validFrom: optionalIsoDateTimeSchema,
  validTo: optionalIsoDateTimeSchema,
  complianceTags: z.array(z.enum(COMPLIANCE_TAG_VALUES)).default([]),
  metadata: jsonObjectSchema.default({}),
})

export const createKnowledgeNodeSchema = knowledgeNodeObjectSchema.refine(validityRule, {
  message: 'validTo must be after validFrom',
  path: ['validTo'],
})

export const updateKnowledgeNodeSchema = knowledgeNodeObjectSchema.partial().refine(validityRule, {
  message: 'validTo must be after validFrom',
  path: ['validTo'],
})

export type CreateKnowledgeNodeSchema = z.infer<typeof createKnowledgeNodeSchema>
export type UpdateKnowledgeNodeSchema = z.infer<typeof updateKnowledgeNodeSchema>
