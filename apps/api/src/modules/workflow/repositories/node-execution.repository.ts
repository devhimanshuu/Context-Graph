/* Node execution repository — Prisma-based persistence for individual node executions. */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type {
  NodeExecution,
  NodeExecutionStatus,
  WorkflowNodeType,
  EntityId,
  Milliseconds,
} from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  INodeExecutionRepository,
  NodeExecutionCreateData,
  NodeExecutionUpdateExtra,
} from '../domain/workflow.interfaces'

function toNodeExecution(row: Record<string, unknown>): NodeExecution {
  return {
    nodeExecutionId: row.id as string,
    executionId: row.executionId as string,
    nodeId: row.nodeId as string,
    nodeName: row.nodeName as string,
    nodeType: row.nodeType as WorkflowNodeType,
    status: row.status as NodeExecutionStatus,
    attempt: (row.attempt as number) ?? 1,
    input: (row.input as Record<string, unknown>) ?? {},
    output: (row.output as Record<string, unknown>) ?? null,
    error: (row.error as string) ?? null,
    startedAt:
      row.startedAt instanceof Date
        ? row.startedAt.toISOString()
        : ((row.startedAt as string) ?? null),
    completedAt:
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : ((row.completedAt as string) ?? null),
    durationMs: (row.durationMs as Milliseconds) ?? null,
  }
}

@Injectable()
export class NodeExecutionPrismaRepository implements INodeExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NodeExecutionCreateData): Promise<NodeExecution> {
    const row = await this.prisma.nodeExecutionModel.create({
      data: {
        id: data.nodeExecutionId,
        executionId: data.executionId,
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        status: 'PENDING',
        maxAttempts: data.maxAttempts,
        input: data.input as unknown as Prisma.InputJsonValue,
      },
    })
    return toNodeExecution(row as unknown as Record<string, unknown>)
  }

  async findById(nodeExecutionId: EntityId): Promise<NodeExecution | null> {
    const row = await this.prisma.nodeExecutionModel.findUnique({
      where: { id: nodeExecutionId },
    })
    return row === null ? null : toNodeExecution(row as unknown as Record<string, unknown>)
  }

  async findByExecution(executionId: EntityId): Promise<readonly NodeExecution[]> {
    const rows = await this.prisma.nodeExecutionModel.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => toNodeExecution(r as unknown as Record<string, unknown>))
  }

  async findByExecutionAndNode(
    executionId: EntityId,
    nodeId: EntityId,
  ): Promise<NodeExecution | null> {
    const row = await this.prisma.nodeExecutionModel.findFirst({
      where: { executionId, nodeId },
    })
    return row === null ? null : toNodeExecution(row as unknown as Record<string, unknown>)
  }

  async updateStatus(
    nodeExecutionId: EntityId,
    status: NodeExecutionStatus,
    extra?: NodeExecutionUpdateExtra,
  ): Promise<void> {
    const data: Record<string, unknown> = { status }

    if (extra !== undefined) {
      if (extra.output !== undefined) data.output = extra.output as unknown as Prisma.InputJsonValue
      if (extra.error !== undefined) data.error = extra.error
      if (extra.startedAt !== undefined)
        data.startedAt = extra.startedAt ? new Date(extra.startedAt) : null
      if (extra.completedAt !== undefined)
        data.completedAt = extra.completedAt ? new Date(extra.completedAt) : null
      if (extra.durationMs !== undefined) data.durationMs = extra.durationMs
    }

    // Set timestamps for key transitions
    if (status === 'RUNNING' && data.startedAt === undefined) {
      data.startedAt = new Date()
    }
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED']
    if (terminalStates.includes(status) && data.completedAt === undefined) {
      data.completedAt = new Date()
    }

    await this.prisma.nodeExecutionModel.update({
      where: { id: nodeExecutionId },
      data,
    })
  }

  async updateOutput(nodeExecutionId: EntityId, output: Record<string, unknown>): Promise<void> {
    await this.prisma.nodeExecutionModel.update({
      where: { id: nodeExecutionId },
      data: { output: output as unknown as Prisma.InputJsonValue },
    })
  }

  async incrementAttempt(nodeExecutionId: EntityId): Promise<void> {
    await this.prisma.nodeExecutionModel.update({
      where: { id: nodeExecutionId },
      data: { attempt: { increment: 1 } },
    })
  }
}
