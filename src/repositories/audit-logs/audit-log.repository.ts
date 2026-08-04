import type { AuditLog } from '@/domain/models'
import type { PageQuery, PageResult } from '@/types'

/**
 * Minimal create-input contract for the append-only log.
 */
export interface CreateAuditLogInput {
  organizationId: string
  workspaceId?: string | null
  actorId?: string | null
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

/**
 * AuditLog data-access contract.
 *
 * Append-only by design: no `update`/`softDelete`. The base repository
 * contract is not extended — only recording and query surfaces are exposed.
 */
export interface AuditLogRepository {
  /** Persist a new audit event. */
  record(input: CreateAuditLogInput): Promise<AuditLog>

  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<AuditLog>>

  /** Full history of a single entity (event-sourcing replay source). */
  findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    params: PageQuery,
  ): Promise<PageResult<AuditLog>>

  findByActor(
    organizationId: string,
    actorId: string,
    params: PageQuery,
  ): Promise<PageResult<AuditLog>>

  findByTimeRange(
    organizationId: string,
    from: Date,
    to: Date,
    params: PageQuery,
  ): Promise<PageResult<AuditLog>>
}
