import {
  type Industry,
  type OrganizationStatus,
  type EntityId,
  type Metadata,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** A tenant. All business data hangs off an Organization. */
export class OrganizationEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly name: string,
    readonly slug: string,
    readonly industry: Industry,
    readonly status: OrganizationStatus,
    readonly configuration: Metadata,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
