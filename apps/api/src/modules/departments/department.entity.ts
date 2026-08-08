import { type EntityId, type Metadata, type Timestamp } from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** An organizational unit with arbitrary hierarchy depth. */
export class DepartmentEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly parentId: EntityId | null,
    readonly name: string,
    readonly code: string,
    readonly hierarchyLevel: number,
    readonly metadata: Metadata,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
