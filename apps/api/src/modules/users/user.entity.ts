import {
  type ComplianceClearance,
  type PermissionLevel,
  type Role,
  type UserStatus,
  type EntityId,
  type Metadata,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** A user within a tenant. Drives permission-aware filtering. */
export class UserEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly departmentId: EntityId | null,
    readonly email: string,
    readonly name: string,
    /** Bcrypt hash for local credential login; null for IdP-only users. */
    readonly passwordHash: string | null,
    readonly role: Role,
    readonly permissionLevel: PermissionLevel,
    readonly complianceClearance: ComplianceClearance,
    readonly status: UserStatus,
    readonly authProviderUserId: string | null,
    readonly metadata: Metadata,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
