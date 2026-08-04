import type { Workspace } from '@/domain/models'
import type { PageQuery, PageResult } from '@/types'
import type { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@/validations/workspace'
import type { BaseRepository } from '@/repositories/base'

export interface WorkspaceRepository extends BaseRepository<
  Workspace,
  string,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<Workspace>>

  findBySlug(organizationId: string, slug: string): Promise<Workspace | null>

  findActiveByOrganization(
    organizationId: string,
    params: PageQuery,
  ): Promise<PageResult<Workspace>>
}
