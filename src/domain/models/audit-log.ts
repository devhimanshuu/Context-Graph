import type { EntityWithId, OrganizationScoped } from '@/domain/base'

/**
 * Append-only event log. One row per state-changing operation; doubles as
 * the foundation for the event-sourcing and real-time modules.
 */
export interface AuditLog extends EntityWithId, OrganizationScoped {
  workspaceId: string | null
  actorId: string | null
  /** Stable action identifier, e.g. "node.created", "edge.deleted". */
  action: string
  /** Target entity kind, e.g. "knowledgeNode". */
  entityType: string
  /** Target entity id. */
  entityId: string
  /** Previous state, for events that changed a record. */
  before: unknown | null
  /** New state after the change. */
  after: unknown | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  occurredAt: Date
}
