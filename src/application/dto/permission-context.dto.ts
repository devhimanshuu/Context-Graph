import { type ComplianceClearance, type PermissionLevel, type Role } from '@/domain/enums'

/**
 * The compiled permission decision set for a request.
 *
 * Produced by `IPermissionCompiler` from the user's role, permission level,
 * compliance clearance and the tenant's permission profiles; consumed by the
 * permission filtering stages to decide which nodes are visible.
 */
export interface PermissionContextDto {
  userId: string
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  /** Node ids the caller is explicitly denied regardless of other grants. */
  deniedNodeIds: string[]
  /** Node ids the caller is explicitly granted regardless of defaults. */
  grantedNodeIds: string[]
  /** Effective clearances derived from the compiled profile. */
  effectiveClearances: ComplianceClearance[]
}
