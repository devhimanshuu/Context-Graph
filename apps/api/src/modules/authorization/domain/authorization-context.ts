import {
  type ComplianceClearance,
  type ComplianceTag,
  type EntityId,
  type OrganizationStatus,
  type PermissionLevel,
  type Role,
  type Timestamp,
} from '@contextgraph/types'

/**
 * The principal's effective authorization state for a request or pipeline run.
 * Produced once by the PermissionCompiler and reused for hundreds/thousands of
 * in-memory evaluations. Immutable by convention: every collection is exposed
 * as a read-only view and nothing on this type mutates after construction.
 */
export interface CompiledAuthorizationContext {
  readonly userId: EntityId
  readonly organizationId: EntityId
  /** Tenant lifecycle; SUSPENDED/ARCHIVED tenants fail closed in the organization policy. */
  readonly organizationStatus: OrganizationStatus
  readonly departmentId: EntityId | null
  readonly role: Role
  readonly permissionLevel: PermissionLevel
  readonly complianceClearance: ComplianceClearance
  /** Tags the principal may clear (class-implied + explicit grants). */
  readonly effectiveComplianceTags: ReadonlySet<ComplianceTag>
  /** Departments the principal may access: own + descendants + explicit grants. */
  readonly accessibleDepartmentIds: ReadonlySet<EntityId>
  /** Verbatim principal metadata (explicit grants, authorized departments). */
  readonly attributes: Readonly<Record<string, unknown>>
  readonly sessionId: string | null
  /** When the context was compiled. */
  readonly compiledAt: Timestamp
  /** Row version used to compile; lets the cache detect staleness. */
  readonly sourceVersion: string | null
}
