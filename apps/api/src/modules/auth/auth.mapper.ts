import type { AuthenticatedUser } from '@contextgraph/types'
import type { UserEntity } from '../users/user.entity'

/** Projects a user entity into the authenticated principal carried by requests. */
export function entityToAuthenticatedUser(entity: UserEntity): AuthenticatedUser {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    departmentId: entity.departmentId,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    permissionLevel: entity.permissionLevel,
    complianceClearance: entity.complianceClearance,
  }
}
