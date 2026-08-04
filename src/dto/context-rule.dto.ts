import type { ContextRule } from '@/domain/models'
import type { CreateContextRuleSchema, UpdateContextRuleSchema } from '@/validations/context-rule'
import type { PublicEntity } from './common'

export type CreateContextRuleRequestDto = CreateContextRuleSchema

export type UpdateContextRuleRequestDto = UpdateContextRuleSchema

export type ContextRuleResponseDto = PublicEntity<ContextRule>
