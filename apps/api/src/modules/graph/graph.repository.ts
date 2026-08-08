import { Injectable } from '@nestjs/common'
import type { EntityId, RelationshipType } from '@contextgraph/types'
import { PrismaService } from '../../database/prisma.service'
import { type GraphEdgeEntity } from './graph-edge.entity'
import { prismaGraphEdgeToEntity } from './graph.mapper'

/** Minimal node projection returned to traversal callers. */
export interface NodeProjection {
  id: EntityId
  title: string
  type: string
  status: string
}

/* Graph persistence contract. Exposes adjacency-shaped queries (by source / */
export abstract class IGraphRepository {
  /** Every query is org-scoped — tenant isolation is a query-plan property. */
  abstract findEdgesBySource(
    organizationId: EntityId,
    workspaceId: EntityId,
    sourceId: EntityId,
  ): Promise<GraphEdgeEntity[]>
  abstract findEdgesByTarget(
    organizationId: EntityId,
    workspaceId: EntityId,
    targetId: EntityId,
  ): Promise<GraphEdgeEntity[]>
  abstract findTypedEdges(
    organizationId: EntityId,
    workspaceId: EntityId,
    relationshipType: RelationshipType,
  ): Promise<GraphEdgeEntity[]>
  abstract findEdgesByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<GraphEdgeEntity[]>
  abstract findNodesByIds(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]>
}

@Injectable()
export class GraphPrismaRepository implements IGraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEdgesBySource(
    organizationId: EntityId,
    workspaceId: EntityId,
    sourceId: EntityId,
  ): Promise<GraphEdgeEntity[]> {
    const rows = await this.prisma.graphEdge.findMany({
      where: { organizationId, workspaceId, sourceId, deletedAt: null },
    })
    return rows.map((row) => prismaGraphEdgeToEntity(row))
  }

  async findEdgesByTarget(
    organizationId: EntityId,
    workspaceId: EntityId,
    targetId: EntityId,
  ): Promise<GraphEdgeEntity[]> {
    const rows = await this.prisma.graphEdge.findMany({
      where: { organizationId, workspaceId, targetId, deletedAt: null },
    })
    return rows.map((row) => prismaGraphEdgeToEntity(row))
  }

  async findTypedEdges(
    organizationId: EntityId,
    workspaceId: EntityId,
    relationshipType: RelationshipType,
  ): Promise<GraphEdgeEntity[]> {
    const rows = await this.prisma.graphEdge.findMany({
      where: { organizationId, workspaceId, relationshipType, deletedAt: null },
    })
    return rows.map((row) => prismaGraphEdgeToEntity(row))
  }

  async findEdgesByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<GraphEdgeEntity[]> {
    const rows = await this.prisma.graphEdge.findMany({
      where: { organizationId, workspaceId, deletedAt: null },
    })
    return rows.map((row) => prismaGraphEdgeToEntity(row))
  }

  async findNodesByIds(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]> {
    return this.prisma.knowledgeNode.findMany({
      where: { organizationId, id: { in: ids }, deletedAt: null },
      select: { id: true, title: true, type: true, status: true },
    })
  }
}
