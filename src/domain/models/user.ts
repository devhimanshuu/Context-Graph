import type {
  EntityWithId,
  OrganizationScoped,
  SoftDeletableEntity,
  TimestampedEntity,
} from '@/domain/base'
import type { ComplianceClearance, PermissionLevel, Role, UserStatus } from '@/domain/enums'

/**
 * A user within a tenant. Authentication lives in a later phase; the profile
 * fields (role, permissionLevel, complianceClearance) drive permission-aware
 * filtering of knowledge.
 */
export interface User
  extends EntityWithId, OrganizationScoped, TimestampedEntity, SoftDeletableEntity {
  departmentId: string | null
  email: string
  name: string
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  status: UserStatus
  /** Opaque provider handle filled in when Supabase Auth lands. */
  authProviderUserId: string | null
  metadata: Record<string, unknown>
}
