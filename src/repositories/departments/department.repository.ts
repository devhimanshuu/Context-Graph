import type { Department } from '@/domain/models'
import type { PageQuery, PageResult } from '@/types'
import type { CreateDepartmentSchema, UpdateDepartmentSchema } from '@/validations/department'
import type { BaseRepository } from '@/repositories/base'

export interface DepartmentRepository extends BaseRepository<
  Department,
  string,
  CreateDepartmentSchema,
  UpdateDepartmentSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<Department>>

  /** Direct children of a department (hierarchy traversal). */
  findChildren(parentId: string, params: PageQuery): Promise<PageResult<Department>>

  /** Root departments (parentId IS NULL) of an organization. */
  findRoots(organizationId: string, params: PageQuery): Promise<PageResult<Department>>

  findByHierarchyLevel(
    organizationId: string,
    level: number,
    params: PageQuery,
  ): Promise<PageResult<Department>>

  findByCode(organizationId: string, code: string): Promise<Department | null>
}
