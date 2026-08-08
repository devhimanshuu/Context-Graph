import { Injectable } from '@nestjs/common'
import type { ContextRule } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type ContextRuleEntity } from './rule.entity'
import { prismaRuleToEntity } from './rule.mapper'

export abstract class IRulesRepository extends BaseRepository<ContextRuleEntity> {
  abstract findActiveByWorkspace(workspaceId: EntityId): Promise<ContextRuleEntity[]>
}

@Injectable()
export class RulesPrismaRepository
  extends BasePrismaRepository<ContextRuleEntity>
  implements IRulesRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.contextRule)
  }

  async findActiveByWorkspace(workspaceId: EntityId): Promise<ContextRuleEntity[]> {
    const rows = await this.delegate.findMany({
      where: { workspaceId, isEnabled: true, status: 'ACTIVE', deletedAt: null },
      orderBy: { priority: 'desc' },
    })
    return rows.map((row) => this.toEntity(row))
  }

  protected toEntity(row: unknown): ContextRuleEntity {
    return prismaRuleToEntity(row as ContextRule)
  }
}
