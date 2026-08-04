import type { EntityWithId, SoftDeletableEntity, TimestampedEntity } from '@/domain/base'
import type { Industry, OrganizationStatus } from '@/domain/enums'

/**
 * A tenant. Every business row in the system hangs off an Organization, which
 * is the hard isolation boundary of all queries.
 */
export interface Organization extends EntityWithId, TimestampedEntity, SoftDeletableEntity {
  name: string
  /** URL-safe unique identifier; used in routes and external references. */
  slug: string
  industry: Industry
  status: OrganizationStatus
  /** Free-form tenant configuration (branding, feature flags, limits). */
  configuration: Record<string, unknown>
}
