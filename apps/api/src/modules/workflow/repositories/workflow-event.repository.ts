/* Workflow event repository — Prisma-based persistence for workflow events. */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { WorkflowEvent, WorkflowEventType, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IWorkflowEventRepository,
  WorkflowEventCreateData,
} from '../domain/workflow.interfaces'

function toWorkflowEvent(row: Record<string, unknown>): WorkflowEvent {
  return {
    eventId: row.id as string,
    executionId: row.executionId as string,
    nodeId: (row.nodeId as string) ?? null,
    eventType: row.eventType as WorkflowEventType,
    timestamp:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

@Injectable()
export class WorkflowEventPrismaRepository implements IWorkflowEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: WorkflowEventCreateData): Promise<WorkflowEvent> {
    const row = await this.prisma.workflowEventModel.create({
      data: {
        id: data.eventId,
        executionId: data.executionId,
        nodeId: data.nodeId,
        eventType: data.eventType,
        metadata: data.metadata as unknown as Prisma.InputJsonValue,
      },
    })
    return toWorkflowEvent(row as unknown as Record<string, unknown>)
  }

  async findByExecution(executionId: EntityId): Promise<readonly WorkflowEvent[]> {
    const rows = await this.prisma.workflowEventModel.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
    })
    return rows.map((r) => toWorkflowEvent(r as unknown as Record<string, unknown>))
  }
}
