import {
  type AuditEntityType,
  type EntityId,
  type Metadata,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** Append-only event log row; foundation for event sourcing and realtime. */
export class AuditLogEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId | null,
    readonly actorId: EntityId | null,
    readonly action: string,
    readonly entityType: AuditEntityType,
    readonly entityId: EntityId,
    readonly before: Metadata | null,
    readonly after: Metadata | null,
    readonly metadata: Metadata,
    readonly ipAddress: string | null,
    readonly occurredAt: Timestamp,
    readonly createdAt: Timestamp,
  ) {
    super()
  }

  get updatedAt(): Timestamp {
    return this.createdAt
  }

  get deletedAt(): Timestamp | null {
    return null
  }
}
