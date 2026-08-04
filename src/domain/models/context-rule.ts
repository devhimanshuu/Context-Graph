import type { AuditedEntity, EntityWithId, OrganizationScoped, TemporalEntity } from '@/domain/base'
import type { ContextRuleStatus } from '@/domain/enums'

/**
 * A deterministic rule for the rule engine: `condition` (a JSON expression
 * tree) is evaluated against a context; when it fires, `action` describes
 * what to emit or do.
 */
export interface ContextRule
  extends EntityWithId, OrganizationScoped, AuditedEntity, TemporalEntity {
  /** Null = organization-wide rule. */
  workspaceId: string | null
  name: string
  description: string | null
  /** Rule condition as a JSON expression tree (see docs/database.md § Rules). */
  condition: Record<string, unknown>
  /** What the rule produces or does when it fires. */
  action: Record<string, unknown>
  priority: number
  status: ContextRuleStatus
  isEnabled: boolean
  version: number
}
