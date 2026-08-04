import type { User } from '@/domain/models'
import type { ComplianceClearance, PermissionLevel, Role } from '@/domain/enums'
import type { PageQuery, PageResult } from '@/types'
import type { CreateUserSchema, UpdateUserSchema } from '@/validations/user'
import type { BaseRepository } from '@/repositories/base'

export interface UserRepository extends BaseRepository<
  User,
  string,
  CreateUserSchema,
  UpdateUserSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<User>>

  findByEmail(organizationId: string, email: string): Promise<User | null>

  findByRole(organizationId: string, role: Role, params: PageQuery): Promise<PageResult<User>>

  findByDepartment(departmentId: string, params: PageQuery): Promise<PageResult<User>>

  findByPermissionLevel(
    organizationId: string,
    level: PermissionLevel,
    params: PageQuery,
  ): Promise<PageResult<User>>

  findByComplianceClearance(
    organizationId: string,
    clearance: ComplianceClearance,
    params: PageQuery,
  ): Promise<PageResult<User>>
}
