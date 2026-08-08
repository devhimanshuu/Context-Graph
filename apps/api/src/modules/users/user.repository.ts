import { Injectable } from '@nestjs/common'
import type { User } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type UserEntity } from './user.entity'
import { prismaUserToEntity } from './user.mapper'

/* Users persistence contract. Auth depends on this abstraction so it never */
export abstract class IUsersRepository extends BaseRepository<UserEntity> {
  abstract findByEmail(organizationId: EntityId, email: string): Promise<UserEntity | null>
  abstract findByOrganization(organizationId: EntityId): Promise<UserEntity[]>
  abstract countByOrganization(organizationId: EntityId): Promise<number>
  abstract findByAuthProviderUserId(providerUserId: string): Promise<UserEntity | null>
}

@Injectable()
export class UsersPrismaRepository
  extends BasePrismaRepository<UserEntity>
  implements IUsersRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.user)
  }

  async findByEmail(organizationId: EntityId, email: string): Promise<UserEntity | null> {
    const row = await this.delegate.findUnique({
      where: { organizationId_email: { organizationId, email } },
    })
    return row === null ? null : this.toEntity(row)
  }

  async findByOrganization(organizationId: EntityId): Promise<UserEntity[]> {
    const rows = await this.delegate.findMany({
      where: { organizationId, deletedAt: null },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async countByOrganization(organizationId: EntityId): Promise<number> {
    return this.delegate.count({ where: { organizationId, deletedAt: null } })
  }

  async findByAuthProviderUserId(providerUserId: string): Promise<UserEntity | null> {
    // NOTE: the schema only has a COMPOSITE unique on (organizationId, authProviderUserId), so
    // `findUnique` on the provider id alone would throw — use `findFirst` instead.
    const row = await this.delegate.findFirst({
      where: { authProviderUserId: providerUserId, deletedAt: null },
    })
    return row === null ? null : this.toEntity(row)
  }

  protected toEntity(row: unknown): UserEntity {
    return prismaUserToEntity(row as User)
  }
}
