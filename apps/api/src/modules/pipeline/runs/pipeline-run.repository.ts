import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { RecordPipelineRunInput } from './pipeline-run.service'
import { type PipelineRunEntity } from './pipeline-run.entity'
import { prismaPipelineRunToEntity } from './pipeline-run.mapper'

export interface PipelineRunListQuery {
  readonly workspaceId?: EntityId
  readonly page: number
  readonly limit: number
}

/**
 * Append-only persistence contract for pipeline runs. Deliberately exposes NO
 * update or delete — an execution record is immutable once written.
 */
export abstract class IPipelineRunRepository {
  abstract record(input: RecordPipelineRunInput): Promise<PipelineRunEntity>
  abstract findByRequestId(
    organizationId: EntityId,
    requestId: string,
  ): Promise<PipelineRunEntity | null>
  abstract findByWorkspace(
    organizationId: EntityId,
    query: PipelineRunListQuery,
  ): Promise<PipelineRunEntity[]>
  /**
   * Returns the requestId of the completed run recorded under a client
   * Idempotency-Key (null when none exists yet).
   */
  abstract findCompletedByOrganizationAndKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<{ requestId: string } | null>
}

@Injectable()
export class PipelineRunPrismaRepository implements IPipelineRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordPipelineRunInput): Promise<PipelineRunEntity> {
    const row = await this.prisma.pipelineRun.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        requestId: input.requestId,
        packageId: input.packageId,
        version: input.version,
        mode: input.mode,
        strategy: input.strategy,
        entryNodeId: input.entryNodeId,
        maxDepth: input.maxDepth,
        tokenBudget: input.tokenBudget,
        maxCandidates: input.maxCandidates,
        evaluatedAt: new Date(input.evaluatedAt),
        status: input.status,
        failedStageId: input.failedStageId,
        request: input.request as unknown as Prisma.InputJsonValue,
        trace: input.trace as unknown as Prisma.InputJsonValue,
        metrics:
          input.metrics === null
            ? Prisma.JsonNull
            : (input.metrics as unknown as Prisma.InputJsonValue),
        candidates:
          input.candidates === null
            ? Prisma.JsonNull
            : (input.candidates as unknown as Prisma.InputJsonValue),
        exclusions:
          input.exclusions === null
            ? Prisma.JsonNull
            : (input.exclusions as unknown as Prisma.InputJsonValue),
        error:
          input.error === null
            ? Prisma.JsonNull
            : (input.error as unknown as Prisma.InputJsonValue),
        tokensUsed: input.tokensUsed,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    })
    return prismaPipelineRunToEntity(row)
  }

  async findCompletedByOrganizationAndKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<{ requestId: string } | null> {
    const row = await this.prisma.pipelineRun.findFirst({
      where: { organizationId, idempotencyKey, status: 'completed' },
      select: { requestId: true },
    })
    return row === null ? null : { requestId: row.requestId }
  }

  async findByRequestId(
    organizationId: EntityId,
    requestId: string,
  ): Promise<PipelineRunEntity | null> {
    const row = await this.prisma.pipelineRun.findFirst({
      where: { organizationId, requestId },
    })
    return row === null ? null : prismaPipelineRunToEntity(row)
  }

  async findByWorkspace(
    organizationId: EntityId,
    query: PipelineRunListQuery,
  ): Promise<PipelineRunEntity[]> {
    const rows = await this.prisma.pipelineRun.findMany({
      where: {
        organizationId,
        ...(query.workspaceId !== undefined ? { workspaceId: query.workspaceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    })
    return rows.map((row) => prismaPipelineRunToEntity(row))
  }
}
