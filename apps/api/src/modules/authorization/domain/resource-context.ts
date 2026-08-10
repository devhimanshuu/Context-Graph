import { type ComplianceTag, type EntityId, type PermissionLevel } from '@contextgraph/types'

/** How visible a resource is within its tenant. */
export const ResourceVisibility = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  PRIVATE: 'PRIVATE',
} as const
export type ResourceVisibility = (typeof ResourceVisibility)[keyof typeof ResourceVisibility]

/**
 * The minimal attribute surface the authorization engine needs to decide on a
 * resource. Deliberately decoupled from Prisma models so the same policies
 * authorize knowledge nodes, documents, graphs, projects and future entities:
 * callers map their own models into this shape at the module boundary.
 */
export interface ResourceAuthorizationContext {
  /** Stable resource identifier (used in decisions and audit trails). */
  readonly id: EntityId
  /** Semantic kind, e.g. "knowledge-node". Free-form, never evaluated. */
  readonly resourceType: string
  /** Owning tenant. Mandatory: multi-tenant isolation is a hard boundary. */
  readonly organizationId: EntityId
  readonly workspaceId?: EntityId | null
  /** Owning department; null = organization-wide resource. */
  readonly departmentId?: EntityId | null
  /** Creator/owner; used by the visibility policy for private resources. */
  readonly ownerId?: EntityId | null
  /** Stricter-than-default level the resource demands (e.g. DELETE of a locked node). */
  readonly requiredPermissionLevel?: PermissionLevel | null
  /** Compliance classifications the resource demands. */
  readonly complianceTags?: readonly ComplianceTag[] | null
  readonly visibility: ResourceVisibility
  /** Resource lifecycle state (free-form; policies may read it via attributes). */
  readonly status?: string | null
  /** Additional resource attributes for future ABAC/PBAC policies. */
  readonly attributes?: Readonly<Record<string, unknown>> | null
}
