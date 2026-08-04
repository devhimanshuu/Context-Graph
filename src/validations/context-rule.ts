import { z } from 'zod'
import { jsonObjectSchema, optionalIsoDateTimeSchema } from '@/validations/common/fields'
import { CONTEXT_RULE_STATUS_VALUES } from '@/constants/domain'

export const createContextRuleSchema = z.object({
  organizationId: z.uuid(),
  /** Null = organization-wide rule. */
  workspaceId: z.uuid().nullish(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  /**
   * Rule condition as a JSON expression tree, e.g.
   * { and: [ { field: "vitals.heartRate", op: "gt", value: 120 }, ... ] }.
   * The rule engine (later phase) interprets this AST.
   */
  condition: jsonObjectSchema,
  action: jsonObjectSchema.default({}),
  priority: z.number().int().min(0).default(0),
  status: z.enum(CONTEXT_RULE_STATUS_VALUES).default('DRAFT'),
  isEnabled: z.boolean().default(false),
  validFrom: optionalIsoDateTimeSchema,
  validTo: optionalIsoDateTimeSchema,
})

export const updateContextRuleSchema = createContextRuleSchema.partial()

export type CreateContextRuleSchema = z.infer<typeof createContextRuleSchema>
export type UpdateContextRuleSchema = z.infer<typeof updateContextRuleSchema>
