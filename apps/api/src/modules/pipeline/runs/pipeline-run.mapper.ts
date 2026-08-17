import type { PipelineRun } from '@prisma/client'
import { PipelineRunEntity } from './pipeline-run.entity'
import type { PipelineRunResponseDto } from './pipeline-run.dto'

export function prismaPipelineRunToEntity(row: PipelineRun): PipelineRunEntity {
  return new PipelineRunEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.actorId,
    row.requestId,
    row.packageId,
    row.version,
    row.mode,
    row.strategy,
    row.entryNodeId,
    row.maxDepth,
    row.tokenBudget,
    row.maxCandidates,
    row.evaluatedAt.toISOString(),
    row.status,
    row.failedStageId,
    row.request as unknown as Record<string, unknown>,
    (row.trace ?? []) as unknown as PipelineRunEntity['trace'],
    (row.metrics ?? null) as unknown as PipelineRunEntity['metrics'],
    (row.candidates ?? []) as unknown as PipelineRunEntity['candidates'],
    (row.exclusions ?? []) as unknown as PipelineRunEntity['exclusions'],
    (row.error ?? null) as unknown as PipelineRunEntity['error'],
    row.tokensUsed,
    row.createdAt.toISOString(),
    row.idempotencyKey,
  )
}

export function entityToPipelineRunResponse(entity: PipelineRunEntity): PipelineRunResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    actorId: entity.actorId,
    requestId: entity.requestId,
    packageId: entity.packageId,
    version: entity.version,
    mode: entity.mode,
    strategy: entity.strategy,
    entryNodeId: entity.entryNodeId,
    maxDepth: entity.maxDepth,
    tokenBudget: entity.tokenBudget,
    maxCandidates: entity.maxCandidates,
    evaluatedAt: entity.evaluatedAt,
    status: entity.status,
    failedStageId: entity.failedStageId,
    request: entity.request,
    trace: [...entity.trace] as unknown as Record<string, unknown>[],
    metrics: entity.metrics as unknown as Record<string, unknown> | null,
    candidates: [...entity.candidates] as unknown as Record<string, unknown>[],
    exclusions: [...entity.exclusions] as unknown as Record<string, unknown>[],
    error: entity.error,
    tokensUsed: entity.tokensUsed,
    createdAt: entity.createdAt,
    ...(entity.idempotencyKey !== null ? { idempotencyKey: entity.idempotencyKey } : {}),
  }
}
