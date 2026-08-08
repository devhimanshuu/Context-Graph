import { Injectable } from '@nestjs/common'
import type { KnowledgeNode } from '@prisma/client'
import { NodeStatus, type EntityId } from '@contextgraph/types'
import { BasePrismaRepository } from '../../common/base/base-prisma.repository'
import { BaseRepository } from '../../common/base/base-repository'
import { PrismaService } from '../../database/prisma.service'
import { type KnowledgeNodeEntity } from './knowledge.entity'
import { prismaKnowledgeNodeToEntity } from './knowledge.mapper'

export abstract class IKnowledgeRepository extends BaseRepository<KnowledgeNodeEntity> {
  /** All queries are scoped by organizationId — tenant isolation is a query-plan property. */
  abstract findByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeEntity[]>
  abstract findActiveByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeEntity[]>
  abstract countByWorkspace(organizationId: EntityId, workspaceId: EntityId): Promise<number>
}

@Injectable()
export class KnowledgePrismaRepository
  extends BasePrismaRepository<KnowledgeNodeEntity>
  implements IKnowledgeRepository
{
  constructor(prisma: PrismaService) {
    super(prisma.knowledgeNode)
  }

  async findByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeEntity[]> {
    const rows = await this.delegate.findMany({
      where: { organizationId, workspaceId, deletedAt: null },
      include: { complianceTags: true },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async findActiveByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeEntity[]> {
    const rows = await this.delegate.findMany({
      where: { organizationId, workspaceId, status: NodeStatus.ACTIVE, deletedAt: null },
      include: { complianceTags: true },
    })
    return rows.map((row) => this.toEntity(row))
  }

  async countByWorkspace(organizationId: EntityId, workspaceId: EntityId): Promise<number> {
    const rows = await this.delegate.findMany({
      where: { organizationId, workspaceId, deletedAt: null },
    })
    return rows.length
  }

  protected toEntity(row: unknown): KnowledgeNodeEntity {
    return prismaKnowledgeNodeToEntity(row as KnowledgeNode)
  }
}
