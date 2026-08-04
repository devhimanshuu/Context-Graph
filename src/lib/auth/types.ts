import type { ComplianceClearance, PermissionLevel, Role } from '@/domain/enums'

/**
 * The authenticated identity carried across requests.
 *
 * In the mock phase this is a cookie payload; with Supabase Auth (Phase 3)
 * it is derived from the session JWT instead — the consuming UI does not
 * change.
 */
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
