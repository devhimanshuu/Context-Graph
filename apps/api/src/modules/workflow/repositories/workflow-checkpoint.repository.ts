/* Workflow checkpoint repository — Prisma-based persistence. */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { WorkflowCheckpoint, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IWorkflowCheckpointRepository,
  WorkflowCheckpointCreateData,
} from '../domain/workflow.interfaces'

function toCheckpoint(row: Record<string, unknown>): WorkflowCheckpoint {
  return {
    checkpointId: row.id as string,
    executionId: row.executionId as string,
    sequence: row.sequence as number,
    workflowVersion: row.workflowVersion as number,
    stateHash: row.stateHash as string,
    stateSnapshot: (row.stateSnapshot as Record<string, unknown>) ?? {},
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
  }
}

@Injectable()
export class WorkflowCheckpointPrismaRepository implements IWorkflowCheckpointRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: WorkflowCheckpointCreateData): Promise<WorkflowCheckpoint> {
    const row = await this.prisma.workflowCheckpointModel.create({
      data: {
        id: data.checkpointId,
        executionId: data.executionId,
        sequence: data.sequence,
        workflowVersion: data.workflowVersion,
        stateHash: data.stateHash,
        stateSnapshot: data.stateSnapshot as unknown as Prisma.InputJsonValue,
      },
    })
    return toCheckpoint(row as unknown as Record<string, unknown>)
  }

  async findLatest(executionId: EntityId): Promise<WorkflowCheckpoint | null> {
    const rows = await this.prisma.workflowCheckpointModel.findMany({
      where: { executionId },
      orderBy: { sequence: 'desc' },
      take: 1,
    })
    return rows.length === 0 ? null : toCheckpoint(rows[0] as unknown as Record<string, unknown>)
  }

  async findByExecution(executionId: EntityId): Promise<readonly WorkflowCheckpoint[]> {
    const rows = await this.prisma.workflowCheckpointModel.findMany({
      where: { executionId },
      orderBy: { sequence: 'asc' },
    })
    return rows.map((r) => toCheckpoint(r as unknown as Record<string, unknown>))
  }
}
