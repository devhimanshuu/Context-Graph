import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import {
  type ComplianceTag,
  type EntityId,
  type Metadata,
  type NodeStatus,
  type NodeType,
  type RelationshipType,
} from '@contextgraph/types'
import { PrismaService } from '../../database/prisma.service'
import { type GraphEdgeEntity } from './graph-edge.entity'
import { prismaGraphEdgeToEntity } from './graph.mapper'
import type { CreateEdgeInput } from './graph.validation'

/**
 * Node data returned to traversal callers. Carries the attributes the
 * authorization engine needs (department, owner, compliance tags, visibility
 * metadata) so permission filtering never needs a second query per node.
 */
export interface NodeProjection {
  id: EntityId
  title: string
  type: NodeType
  status: NodeStatus
  departmentId: EntityId | null
  createdById: EntityId | null
  complianceTags: ComplianceTag[]
  metadata: Metadata
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
    const rows = await this.prisma.knowledgeNode.findMany({
      where: { organizationId, id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        departmentId: true,
        createdById: true,
        metadata: true,
        complianceTags: { select: { tag: true } },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      departmentId: row.departmentId,
      createdById: row.createdById,
      complianceTags: row.complianceTags.map((entry) => entry.tag),
      metadata: row.metadata as Metadata,
    }))
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
