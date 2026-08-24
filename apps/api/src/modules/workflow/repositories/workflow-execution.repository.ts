/* Workflow execution repository — Prisma-based persistence.

All queries are organization-scoped for tenant isolation.
*/

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { WorkflowExecution, WorkflowExecutionStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IWorkflowExecutionRepository,
  WorkflowExecutionCreateData,
  WorkflowExecutionUpdateExtra,
  WorkflowAnalyticsRecord,
} from '../domain/workflow.interfaces'

function toWorkflowExecution(row: Record<string, unknown>): WorkflowExecution {
  return {
    executionId: row.id as string,
    workflowId: row.workflowId as string,
    workflowVersion: row.workflowVersion as number,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    workspaceId: (row.workspaceId as string) ?? null,
    status: row.status as WorkflowExecutionStatus,
    input: (row.input as Record<string, unknown>) ?? {},
    output: (row.output as Record<string, unknown>) ?? null,
    currentNodes: (row.currentNodes as string[]) ?? [],
    completedNodes: (row.completedNodes as string[]) ?? [],
    failedNodes: (row.failedNodes as string[]) ?? [],
    error: (row.error as string) ?? null,
    tokenUsage: (row.tokenUsage as number) ?? 0,
    estimatedCost: (row.estimatedCost as number) ?? 0,
    startedAt:
      row.startedAt instanceof Date
        ? row.startedAt.toISOString()
        : ((row.startedAt as string) ?? ''),
    completedAt:
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : ((row.completedAt as string) ?? null),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
  }
}

@Injectable()
export class WorkflowExecutionPrismaRepository implements IWorkflowExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: WorkflowExecutionCreateData): Promise<WorkflowExecution> {
    const row = await this.prisma.workflowExecutionModel.create({
      data: {
        id: data.executionId,
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        workflowId: data.workflowId,
        workflowVersion: data.workflowVersion,
        userId: data.userId,
        status: 'PENDING',
        input: data.input as unknown as Prisma.InputJsonValue,
      },
    })
    return toWorkflowExecution(row as unknown as Record<string, unknown>)
  }

  async findById(executionId: EntityId): Promise<WorkflowExecution | null> {
    const row = await this.prisma.workflowExecutionModel.findUnique({
      where: { id: executionId },
    })
    return row === null ? null : toWorkflowExecution(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    limit = 20,
  ): Promise<readonly WorkflowExecution[]> {
    const rows = await this.prisma.workflowExecutionModel.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => toWorkflowExecution(r as unknown as Record<string, unknown>))
  }

  async findByWorkflow(workflowId: EntityId, limit = 20): Promise<readonly WorkflowExecution[]> {
    const rows = await this.prisma.workflowExecutionModel.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => toWorkflowExecution(r as unknown as Record<string, unknown>))
  }

  async findByUser(userId: EntityId, limit = 20): Promise<readonly WorkflowExecution[]> {
    const rows = await this.prisma.workflowExecutionModel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => toWorkflowExecution(r as unknown as Record<string, unknown>))
  }

  async updateStatus(
    executionId: EntityId,
    status: WorkflowExecutionStatus,
    extra?: WorkflowExecutionUpdateExtra,
  ): Promise<void> {
    const data: Record<string, unknown> = { status }

    if (extra !== undefined) {
      if (extra.output !== undefined) data.output = extra.output as unknown as Prisma.InputJsonValue
      if (extra.error !== undefined) data.error = extra.error
      if (extra.startedAt !== undefined)
        data.startedAt = extra.startedAt ? new Date(extra.startedAt) : null
      if (extra.completedAt !== undefined)
        data.completedAt = extra.completedAt ? new Date(extra.completedAt) : null
    }

    // Set completedAt for terminal states
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']
    if (terminalStates.includes(status) && data.completedAt === undefined) {
      data.completedAt = new Date()
    }

    // Set startedAt when transitioning to RUNNING
    if (status === 'RUNNING' && data.startedAt === undefined) {
      data.startedAt = new Date()
    }

    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data,
    })
  }

  async updateCurrentNodes(
    executionId: EntityId,
    currentNodes: readonly EntityId[],
  ): Promise<void> {
    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data: { currentNodes: [...currentNodes] },
    })
  }

  async addCompletedNode(executionId: EntityId, nodeId: EntityId): Promise<void> {
    const execution = await this.prisma.workflowExecutionModel.findUnique({
      where: { id: executionId },
      select: { completedNodes: true },
    })
    if (!execution) return

    const nodes = [...(execution.completedNodes as string[]), nodeId]
    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data: { completedNodes: nodes },
    })
  }

  async addFailedNode(executionId: EntityId, nodeId: EntityId): Promise<void> {
    const execution = await this.prisma.workflowExecutionModel.findUnique({
      where: { id: executionId },
      select: { failedNodes: true },
    })
    if (!execution) return

    const nodes = [...(execution.failedNodes as string[]), nodeId]
    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data: { failedNodes: nodes },
    })
  }

  async incrementTokenUsage(executionId: EntityId, tokens: number): Promise<void> {
    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data: { tokenUsage: { increment: tokens } },
    })
  }

  async incrementCost(executionId: EntityId, cost: number): Promise<void> {
    await this.prisma.workflowExecutionModel.update({
      where: { id: executionId },
      data: { estimatedCost: { increment: cost } },
    })
  }

  async incrementAgentCalls(_executionId: EntityId): Promise<void> {
    // Tracked via node execution records, not a direct column
  }

  async incrementToolCalls(_executionId: EntityId): Promise<void> {
    // Tracked via node execution records, not a direct column
  }

  async getAnalytics(
    organizationId: EntityId,
    from: string,
    to: string,
  ): Promise<WorkflowAnalyticsRecord> {
    const fromDate = new Date(from)
    const toDate = new Date(to)

    const rows = await this.prisma.workflowExecutionModel.findMany({
      where: {
        organizationId,
        createdAt: { gte: fromDate, lte: toDate },
      },
    })

    if (rows.length === 0) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        cancelledExecutions: 0,
        timedOutExecutions: 0,
        averageDurationMs: 0,
        averageNodeCount: 0,
        averageAgentCalls: 0,
        totalToolCalls: 0,
        totalTokenUsage: 0,
        estimatedTotalCost: 0,
        averageRetries: 0,
        averageApprovalWaitMs: 0,
        authorizationViolations: 0,
      }
    }

    const completed = rows.filter((r) => r.status === 'COMPLETED')
    const failed = rows.filter((r) => r.status === 'FAILED')
    const cancelled = rows.filter((r) => r.status === 'CANCELLED')
    const timedOut = rows.filter((r) => r.status === 'TIMED_OUT')

    let totalDurationMs = 0
    for (const r of rows) {
      if (r.completedAt && r.startedAt) {
        totalDurationMs += r.completedAt.getTime() - r.startedAt.getTime()
      }
    }

    return {
      totalExecutions: rows.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      cancelledExecutions: cancelled.length,
      timedOutExecutions: timedOut.length,
      averageDurationMs: Math.round(totalDurationMs / rows.length),
      averageNodeCount: 0,
      averageAgentCalls: 0,
      totalToolCalls: 0,
      totalTokenUsage: rows.reduce((sum, r) => sum + r.tokenUsage, 0),
      estimatedTotalCost: Math.round(rows.reduce((sum, r) => sum + r.estimatedCost, 0) * 100) / 100,
      averageRetries: 0,
      averageApprovalWaitMs: 0,
      authorizationViolations: 0,
    }
  }
}
