import { Injectable } from '@nestjs/common'
import type { Department } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type DepartmentEntity } from './department.entity'
import { prismaDepartmentToEntity } from './department.mapper'

export abstract class IDepartmentsRepository extends BaseRepository<DepartmentEntity> {
  abstract findByOrganization(organizationId: EntityId): Promise<DepartmentEntity[]>
  abstract findByOrganizationAndCode(
    organizationId: EntityId,
    code: string,
  ): Promise<DepartmentEntity | null>
}

@Injectable()
export class DepartmentsPrismaRepository
  extends BasePrismaRepository<DepartmentEntity>
  implements IDepartmentsRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.department)
  }

  async findByOrganization(organizationId: EntityId): Promise<DepartmentEntity[]> {
    const rows = await this.delegate.findMany({
      where: { organizationId, deletedAt: null },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async findByOrganizationAndCode(
    organizationId: EntityId,
    code: string,
  ): Promise<DepartmentEntity | null> {
    const row = await this.delegate.findUnique({
      where: { organizationId_code: { organizationId, code } },
    })
    return row === null ? null : this.toEntity(row)
  }

  protected toEntity(row: unknown): DepartmentEntity {
    return prismaDepartmentToEntity(row as Department)
  }
}
