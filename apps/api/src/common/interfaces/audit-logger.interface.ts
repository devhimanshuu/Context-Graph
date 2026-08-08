import type { AuditEntityType, EntityId, Metadata, Timestamp } from '@contextgraph/types'

/** A single append-only audit entry. */
export interface AuditLogEntry {
  organizationId: EntityId
  workspaceId: EntityId | null
  actorId: EntityId | null
  action: string
  entityType: AuditEntityType
  entityId: EntityId
  before: Metadata | null
  after: Metadata | null
  metadata: Metadata
  ipAddress: string | null
  occurredAt: Timestamp
}

/* Audit trail contract. The AuditModule repository is the default */
export interface IAuditLogger {
  record(entry: AuditLogEntry): Promise<void>
}

/** DI token for the audit logger. */
export const AUDIT_LOGGER = Symbol('IAuditLogger')
