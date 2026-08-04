import { type ComplianceClearance, type PermissionLevel, type Role } from '@/domain/enums'

/**
 * The authenticated caller projected for pipeline consumption.
 *
 * Carries the identity + permission attributes that every stage uses to make
 * decisions. Assembled once per request by the permission stage (from the
 * domain `User` + `PermissionProfile` via `IUserContextMapper`), then threaded
 * through the pipeline in `PipelineContext`.
 */
export interface UserContextDto {
  userId: string
  organizationId: string
  /** Active workspace, or null for organization-wide context. */
  workspaceId: string | null
  departmentId: string | null
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
}
