import type { EntityId, Metadata, Timestamp } from "../primitives";
import type { AuditEntityType } from "../enums";

/** Append-only event log row; foundation for event sourcing and realtime. */
export interface AuditLog {
  id: EntityId;
  organizationId: EntityId;
  workspaceId: EntityId | null;
  actorId: EntityId | null;
  action: string;
  entityType: AuditEntityType;
  /** Polymorphic target id (any entity kind). */
  entityId: EntityId;
  /** Previous state for events that changed a record (event sourcing). */
  before: Metadata | null;
  /** New state after the change. */
  after: Metadata | null;
  metadata: Metadata;
  ipAddress: string | null;
  occurredAt: Timestamp;
}
