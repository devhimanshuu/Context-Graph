import type { ContextRule } from '@/domain/models'
import type { ContextRuleStatus } from '@/domain/enums'
import type { PageQuery, PageResult } from '@/types'
import type { CreateContextRuleSchema, UpdateContextRuleSchema } from '@/validations/context-rule'
import type { BaseRepository } from '@/repositories/base'

export interface ContextRuleRepository extends BaseRepository<
  ContextRule,
  string,
  CreateContextRuleSchema,
  UpdateContextRuleSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<ContextRule>>

  findByWorkspace(workspaceId: string, params: PageQuery): Promise<PageResult<ContextRule>>

  /** Enabled, valid rules ordered by priority — the rule engine's input set. */
  findEnabledAndValidAt(workspaceId: string, at: Date): Promise<ContextRule[]>

  findByStatus(
    organizationId: string,
    status: ContextRuleStatus,
    params: PageQuery,
  ): Promise<PageResult<ContextRule>>
}
