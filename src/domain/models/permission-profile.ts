import type {
  EntityWithId,
  OrganizationScoped,
  SoftDeletableEntity,
  TimestampedEntity,
} from '@/domain/base'

/**
 * A named, versioned set of permission rules. `rules` is a JSON document
 * (role → entity → action grants) consumed by the permission compiler in a
 * later phase.
 */
export interface PermissionProfile
  extends EntityWithId, OrganizationScoped, TimestampedEntity, SoftDeletableEntity {
  /** Null = organization-wide profile; non-null = workspace-scoped. */
  workspaceId: string | null
  name: string
  description: string | null
  rules: unknown[]
  isDefault: boolean
  version: number
}

/** Explicit, audited grant of a permission profile to a user. */
export interface PermissionProfileAssignment {
  id: string
  profileId: string
  userId: string
  grantedById: string | null
  grantedAt: Date
  revokedAt: Date | null
}
