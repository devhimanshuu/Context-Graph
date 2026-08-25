/* Usage repository — Prisma-based persistence for usage and cost tracking. */

import { Injectable } from '@nestjs/common'
import type { UsageRecord, EntityId, Timestamp } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IUsageRepository,
  UsageRecordCreateData,
  UsageTotals,
  DailyUsage,
} from '../domain/governance.interfaces'

function toUsageRecord(row: Record<string, unknown>): UsageRecord {
  return {
    usageId: row.id as string,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    agentId: (row.agentId as string) ?? null,
    workflowId: (row.workflowId as string) ?? null,
    modelProvider: row.modelProvider as string,
    modelName: row.modelName as string,
    inputTokens: row.inputTokens as number,
    outputTokens: row.outputTokens as number,
    toolCalls: row.toolCalls as number,
    retrievalCalls: row.retrievalCalls as number,
    embeddingsCount: row.embeddingsCount as number,
    storageBytes: Number(row.storageBytes ?? 0),
    durationMs: row.durationMs as number,
    estimatedCost: row.estimatedCost as number,
    timestamp:
      row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp as string),
  }
}

@Injectable()
export class UsagePrismaRepository implements IUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(data: UsageRecordCreateData): Promise<UsageRecord> {
    const row = await this.prisma.usageRecord.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        agentId: data.agentId,
        workflowId: data.workflowId,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        toolCalls: data.toolCalls,
        retrievalCalls: data.retrievalCalls,
        embeddingsCount: data.embeddingsCount,
        storageBytes: data.storageBytes,
        durationMs: data.durationMs,
        estimatedCost: data.estimatedCost,
      },
    })
    return toUsageRecord(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly UsageRecord[]> {
    const rows = await this.prisma.usageRecord.findMany({
      where: { organizationId, timestamp: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { timestamp: 'desc' },
    })
    return rows.map((r) => toUsageRecord(r as unknown as Record<string, unknown>))
  }

  async findByUser(
    userId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly UsageRecord[]> {
    const rows = await this.prisma.usageRecord.findMany({
      where: { userId, timestamp: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { timestamp: 'desc' },
    })
    return rows.map((r) => toUsageRecord(r as unknown as Record<string, unknown>))
  }

  async getTotals(organizationId: EntityId, from: Timestamp, to: Timestamp): Promise<UsageTotals> {
    const result = await this.prisma.usageRecord.aggregate({
      where: { organizationId, timestamp: { gte: new Date(from), lte: new Date(to) } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        toolCalls: true,
        retrievalCalls: true,
        estimatedCost: true,
      },
      _count: true,
    })
    return {
      totalInputTokens: result._sum.inputTokens ?? 0,
      totalOutputTokens: result._sum.outputTokens ?? 0,
      totalToolCalls: result._sum.toolCalls ?? 0,
      totalRetrievalCalls: result._sum.retrievalCalls ?? 0,
      totalCost: result._sum.estimatedCost ?? 0,
      recordCount: result._count,
    }
  }

  async getDailyBreakdown(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly DailyUsage[]> {
    const rows = await this.prisma.usageRecord.groupBy({
      by: ['timestamp'],
      where: { organizationId, timestamp: { gte: new Date(from), lte: new Date(to) } },
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      orderBy: { timestamp: 'asc' },
    })
    return rows.map((r) => ({
      date:
        (r.timestamp instanceof Date
          ? r.timestamp.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]) ?? '',
      inputTokens: r._sum.inputTokens ?? 0,
      outputTokens: r._sum.outputTokens ?? 0,
      cost: r._sum.estimatedCost ?? 0,
    }))
  }
}
