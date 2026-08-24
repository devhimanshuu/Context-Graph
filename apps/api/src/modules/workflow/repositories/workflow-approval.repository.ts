/* Workflow approval repository — Prisma-based persistence. */

import { Injectable } from '@nestjs/common'
import type { WorkflowApprovalRequest, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IWorkflowApprovalRepository,
  WorkflowApprovalCreateData,
} from '../domain/workflow.interfaces'

function toApproval(row: Record<string, unknown>): WorkflowApprovalRequest {
  return {
    approvalId: row.id as string,
    executionId: row.executionId as string,
    nodeExecutionId: row.nodeExecutionId as string,
    nodeId: row.nodeId as string,
    requestedAction: row.requestedAction as string,
    riskLevel: row.riskLevel as string,
    requestedBy: row.requestedBy as string,
    status: row.status as WorkflowApprovalRequest['status'],
    approver: (row.approver as string) ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    resolvedAt:
      row.resolvedAt instanceof Date
        ? row.resolvedAt.toISOString()
        : ((row.resolvedAt as string) ?? null),
  }
}

@Injectable()
export class WorkflowApprovalPrismaRepository implements IWorkflowApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: WorkflowApprovalCreateData): Promise<WorkflowApprovalRequest> {
    const row = await this.prisma.workflowApprovalModel.create({
      data: {
        id: data.approvalId,
        executionId: data.executionId,
        nodeExecutionId: data.nodeExecutionId,
        nodeId: data.nodeId,
        requestedAction: data.requestedAction,
        riskLevel: data.riskLevel,
        requestedBy: data.requestedBy,
        status: 'PENDING',
        expiresAt: new Date(data.expiresAt),
      },
    })
    return toApproval(row as unknown as Record<string, unknown>)
  }

  async findById(approvalId: EntityId): Promise<WorkflowApprovalRequest | null> {
    const row = await this.prisma.workflowApprovalModel.findUnique({
      where: { id: approvalId },
    })
    return row === null ? null : toApproval(row as unknown as Record<string, unknown>)
  }

  async findByExecution(executionId: EntityId): Promise<readonly WorkflowApprovalRequest[]> {
    const rows = await this.prisma.workflowApprovalModel.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => toApproval(r as unknown as Record<string, unknown>))
  }

  async updateStatus(
    approvalId: EntityId,
    status: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    approverId?: EntityId,
    note?: string,
  ): Promise<void> {
    await this.prisma.workflowApprovalModel.update({
      where: { id: approvalId },
      data: {
        status,
        approverId: approverId ?? null,
        approverNote: note ?? null,
        resolvedAt: new Date(),
      },
    })
  }
}
