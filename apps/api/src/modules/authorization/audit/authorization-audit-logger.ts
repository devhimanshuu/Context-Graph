import { Inject, Injectable } from '@nestjs/common'
import { AuditEntityType, type EntityId } from '@contextgraph/types'
import { AUDIT_LOGGER, type IAuditLogger } from '../../../common/interfaces/audit-logger.interface'

/** What the audit trail records about a denial — never resource content, tokens or secrets. */
export interface AuthorizationAuditEntry {
  readonly organizationId: EntityId
  readonly actorId: EntityId
  readonly resourceType: string
  readonly resourceId: EntityId
  readonly reason: string
  readonly failedPolicy: string | null
}

/** Audit contract of the authorization engine. */
export interface IAuthorizationAuditLogger {
  recordDenial(entry: AuthorizationAuditEntry): Promise<void>
  recordEvent(
    action: string,
    organizationId: EntityId,
    actorId: EntityId,
    details: Record<string, unknown>,
  ): Promise<void>
}

/** DI token for the authorization audit logger. */
export const AUTHORIZATION_AUDIT_LOGGER = Symbol('IAuthorizationAuditLogger')

@Injectable()
export class AuthorizationAuditLogger implements IAuthorizationAuditLogger {
  constructor(@Inject(AUDIT_LOGGER) private readonly audit: IAuditLogger) {}

  async recordDenial(entry: AuthorizationAuditEntry): Promise<void> {
    await this.audit.record({
      organizationId: entry.organizationId,
      workspaceId: null,
      actorId: entry.actorId,
      action: 'AUTHORIZATION_DENIED',
      entityType: AuditEntityType.KNOWLEDGE_NODE,
      entityId: entry.resourceId,
      before: null,
      after: null,
      metadata: {
        resourceType: entry.resourceType,
        reason: entry.reason,
        failedPolicy: entry.failedPolicy,
      },
      ipAddress: null,
      occurredAt: new Date().toISOString(),
    })
  }

  async recordEvent(
    action: string,
    organizationId: EntityId,
    actorId: EntityId,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record({
      organizationId,
      workspaceId: null,
      actorId,
      action,
      entityType: AuditEntityType.USER,
      entityId: actorId,
      before: null,
      after: null,
      metadata: details,
      ipAddress: null,
      occurredAt: new Date().toISOString(),
    })
  }
}
