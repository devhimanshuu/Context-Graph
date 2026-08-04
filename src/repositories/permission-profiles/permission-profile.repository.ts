import type { PermissionProfile } from '@/domain/models'
import type { PageQuery, PageResult } from '@/types'
import type {
  CreatePermissionProfileSchema,
  UpdatePermissionProfileSchema,
} from '@/validations/permission-profile'
import type { BaseRepository } from '@/repositories/base'

export interface PermissionProfileRepository extends BaseRepository<
  PermissionProfile,
  string,
  CreatePermissionProfileSchema,
  UpdatePermissionProfileSchema
> {
  findByOrganization(
    organizationId: string,
    params: PageQuery,
  ): Promise<PageResult<PermissionProfile>>

  findByWorkspace(workspaceId: string, params: PageQuery): Promise<PageResult<PermissionProfile>>

  /** The org-wide default profile (fallback grants for the permission compiler). */
  findDefault(organizationId: string): Promise<PermissionProfile | null>
}
