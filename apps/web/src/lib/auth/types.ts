import type { ComplianceClearance, PermissionLevel, Role } from '@/domain/enums'

/* The authenticated identity carried across requests. */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  organizationId: string
  organizationName: string
  organizationSlug: string
}
