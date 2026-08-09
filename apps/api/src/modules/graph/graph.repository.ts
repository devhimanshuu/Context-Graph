import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type { EntityId, NodeStatus, NodeType, RelationshipType } from '@contextgraph/types'
import { PrismaService } from '../../database/prisma.service'
import { type GraphEdgeEntity } from './graph-edge.entity'
import { prismaGraphEdgeToEntity } from './graph.mapper'
import type { CreateEdgeInput } from './graph.validation'

/** Minimal node projection returned to traversal callers. */
export interface NodeProjection {
  id: EntityId
  title: string
  type: NodeType
  status: NodeStatus
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
  /** Persists a new edge. Callers validate the DAG invariant before invoking. */
  abstract createEdge(
    organizationId: EntityId,
    workspaceId: EntityId,
    input: CreateEdgeInput,
    id: EntityId,
    createdById: EntityId | null,
  ): Promise<GraphEdgeEntity>
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

  async createEdge(
    organizationId: EntityId,
    workspaceId: EntityId,
    input: CreateEdgeInput,
    id: EntityId,
    createdById: EntityId | null,
  ): Promise<GraphEdgeEntity> {
    const row = await this.prisma.graphEdge.create({
      data: {
        id,
        organizationId,
        workspaceId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        relationshipType: input.relationshipType,
        weight: input.weight,
        metadata: input.metadata as Prisma.InputJsonValue,
        createdById,
      },
    })
    return prismaGraphEdgeToEntity(row)
  }
}
