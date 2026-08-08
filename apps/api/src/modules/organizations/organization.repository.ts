import { Injectable } from '@nestjs/common'
import type { Organization } from '@prisma/client'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type OrganizationEntity } from './organization.entity'
import { prismaOrganizationToEntity } from './organization.mapper'

export abstract class IOrganizationsRepository extends BaseRepository<OrganizationEntity> {
  abstract findBySlug(slug: string): Promise<OrganizationEntity | null>
}

@Injectable()
export class OrganizationsPrismaRepository
  extends BasePrismaRepository<OrganizationEntity>
  implements IOrganizationsRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.organization)
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const row = await this.delegate.findUnique({ where: { slug } })
    return row === null ? null : this.toEntity(row)
  }

  protected toEntity(row: unknown): OrganizationEntity {
    return prismaOrganizationToEntity(row as Organization)
  }
}
