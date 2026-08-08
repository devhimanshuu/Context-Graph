import { Injectable } from '@nestjs/common'
import type { PermissionProfile } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type PermissionProfileEntity } from './permission-profile.entity'
import { prismaProfileToEntity } from './permission.mapper'

export abstract class IProfilesRepository extends BaseRepository<PermissionProfileEntity> {
  abstract findByOrganization(organizationId: EntityId): Promise<PermissionProfileEntity[]>
  abstract findProfilesForUser(userId: EntityId): Promise<PermissionProfileEntity[]>
  abstract assign(
    profileId: EntityId,
    userId: EntityId,
    grantedById: EntityId | null,
  ): Promise<void>
}

@Injectable()
export class ProfilesPrismaRepository
  extends BasePrismaRepository<PermissionProfileEntity>
  implements IProfilesRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.permissionProfile)
  }

  async findByOrganization(organizationId: EntityId): Promise<PermissionProfileEntity[]> {
    const rows = await this.delegate.findMany({
      where: { organizationId, deletedAt: null },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async findProfilesForUser(userId: EntityId): Promise<PermissionProfileEntity[]> {
    const rows = await this.delegate.findMany({
      where: { assignments: { some: { userId, revokedAt: null } }, deletedAt: null },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async assign(profileId: EntityId, userId: EntityId, grantedById: EntityId | null): Promise<void> {
    await this.delegate.update({
      where: { id: profileId },
      data: {
        assignments: {
          upsert: {
            where: { profileId_userId: { profileId, userId } },
            create: { userId, grantedById },
            update: { grantedById, revokedAt: null },
          },
        },
      },
    })
  }

  protected toEntity(row: unknown): PermissionProfileEntity {
    return prismaProfileToEntity(row as PermissionProfile)
  }
}
