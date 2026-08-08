import { type EntityId, type Metadata, type Timestamp } from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/* A named, versioned set of permission rules. `rules` is a JSON document */
export class PermissionProfileEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId | null,
    readonly name: string,
    readonly description: string | null,
    readonly rules: Metadata,
    readonly isDefault: boolean,
    readonly version: number,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
