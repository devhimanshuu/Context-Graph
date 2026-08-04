import type {
  EntityWithId,
  OrganizationScoped,
  SoftDeletableEntity,
  TimestampedEntity,
} from '@/domain/base'
import type { WorkspaceStatus } from '@/domain/enums'

/**
 * A named domain container inside an organization (e.g. "Inpatient
 * Assessment", "KYC Onboarding"). Knowledge, edges and rules are scoped to a
 * workspace; the workspace is the operational security boundary.
 */
export interface Workspace
  extends EntityWithId, OrganizationScoped, TimestampedEntity, SoftDeletableEntity {
  name: string
  /** Unique within the organization. */
  slug: string
  description: string | null
  status: WorkspaceStatus
}
