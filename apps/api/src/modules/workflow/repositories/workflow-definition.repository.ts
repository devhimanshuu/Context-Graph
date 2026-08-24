/* Workflow definition repository — Prisma-based persistence.

All queries are organization-scoped for tenant isolation.
*/

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '@contextgraph/types'
import type { WorkflowDefinitionStatus } from '@contextgraph/types'
import type { EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IWorkflowDefinitionRepository,
  WorkflowDefinitionCreateData,
} from '../domain/workflow.interfaces'

function toWorkflowDefinition(row: Record<string, unknown>): WorkflowDefinition {
  return {
    workflowId: row.id as string,
    name: row.name as string,
    description: row.description as string,
    version: row.version as number,
    status: row.status as WorkflowDefinitionStatus,
    nodes: (row.nodes as WorkflowNode[]) ?? [],
    edges: (row.edges as WorkflowEdge[]) ?? [],
    inputSchema: (row.inputSchema as Record<string, unknown>) ?? {},
    outputSchema: (row.outputSchema as Record<string, unknown>) ?? {},
    executionPolicy: row.executionPolicy as unknown as WorkflowDefinition['executionPolicy'],
    organizationId: row.organizationId as string,
    createdBy: row.createdBy as string,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class WorkflowDefinitionPrismaRepository implements IWorkflowDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: WorkflowDefinitionCreateData): Promise<WorkflowDefinition> {
    const row = await this.prisma.workflowDefinition.create({
      data: {
        id: data.workflowId,
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        createdBy: data.createdBy,
        name: data.name,
        description: data.description,
        version: data.version,
        status: 'DRAFT',
        nodes: data.nodes as unknown as Prisma.InputJsonValue,
        edges: data.edges as unknown as Prisma.InputJsonValue,
        inputSchema: data.inputSchema as unknown as Prisma.InputJsonValue,
        outputSchema: data.outputSchema as unknown as Prisma.InputJsonValue,
        executionPolicy: data.executionPolicy as unknown as Prisma.InputJsonValue,
      },
    })

    return toWorkflowDefinition(row as unknown as Record<string, unknown>)
  }

  async findById(workflowId: EntityId): Promise<WorkflowDefinition | null> {
    const row = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
    })
    return row === null ? null : toWorkflowDefinition(row as unknown as Record<string, unknown>)
  }

  async findByName(
    organizationId: EntityId,
    name: string,
    version?: number,
  ): Promise<WorkflowDefinition | null> {
    const where: Record<string, unknown> = { organizationId_name: { organizationId, name } }
    if (version !== undefined) {
      ;(where as Record<string, unknown>).version = version
    }
    const row = await this.prisma.workflowDefinition.findUnique({
      where: where as { id: string },
    })
    return row === null ? null : toWorkflowDefinition(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    status?: WorkflowDefinitionStatus,
  ): Promise<readonly WorkflowDefinition[]> {
    const where: Record<string, unknown> = { organizationId }
    if (status) where.status = status
    const rows = await this.prisma.workflowDefinition.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toWorkflowDefinition(r as unknown as Record<string, unknown>))
  }

  async updateStatus(workflowId: EntityId, status: WorkflowDefinitionStatus): Promise<void> {
    await this.prisma.workflowDefinition.update({
      where: { id: workflowId },
      data: { status },
    })
  }

  async findLatestVersion(
    organizationId: EntityId,
    name: string,
  ): Promise<WorkflowDefinition | null> {
    const rows = await this.prisma.workflowDefinition.findMany({
      where: { organizationId, name },
      orderBy: { version: 'desc' },
      take: 1,
    })
    return rows.length === 0
      ? null
      : toWorkflowDefinition(rows[0] as unknown as Record<string, unknown>)
  }

  async countByOrganization(organizationId: EntityId): Promise<number> {
    return this.prisma.workflowDefinition.count({
      where: { organizationId },
    })
  }
}
