import { type PermissionLevel } from '@/domain/enums'

/**
 * Strongly typed permission configuration.
 */
export interface PermissionConfig {
  /** How long compiled permission contexts are cached. */
  cacheTtlSeconds: number
  /** Fallback permission level when no profile grants anything. */
  defaultPermissionLevel: PermissionLevel
  /** Enforce compliance-clearance filtering on top of role-based access. */
  enforceComplianceClearance: boolean
  /** Honor explicit grant/deny node lists. */
  allowListDenyListEnabled: boolean
}
