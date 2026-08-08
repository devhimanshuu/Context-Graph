import {
  type RelationshipType,
  type EntityId,
  type Metadata,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** A directed, typed relationship between two knowledge nodes. */
export class GraphEdgeEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId,
    readonly sourceId: EntityId,
    readonly targetId: EntityId,
    readonly relationshipType: RelationshipType,
    readonly weight: number,
    readonly validFrom: Timestamp | null,
    readonly validTo: Timestamp | null,
    readonly metadata: Metadata,
    readonly createdById: EntityId | null,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
