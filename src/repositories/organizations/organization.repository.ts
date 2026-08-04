import type { Organization } from '@/domain/models'
import type { PageQuery, PageResult } from '@/types'
import type { CreateOrganizationSchema, UpdateOrganizationSchema } from '@/validations/organization'
import type { BaseRepository } from '@/repositories/base'

/**
 * Organization (tenant) data-access contract.
 *
 * Interface only — implementations land with the business features. All
 * methods scope to a single tenant by construction (they take
 * `organizationId` rather than returning cross-tenant data).
 */
export interface OrganizationRepository extends BaseRepository<
  Organization,
  string,
  CreateOrganizationSchema,
  UpdateOrganizationSchema
> {
  findBySlug(slug: string): Promise<Organization | null>

  /** Tenants in `ACTIVE` status — used by provisioning/onboarding flows. */
  findActive(params: PageQuery): Promise<PageResult<Organization>>
}
