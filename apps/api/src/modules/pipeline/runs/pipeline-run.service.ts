import { Inject, Injectable } from '@nestjs/common'
import type { EntityId, Metadata, Timestamp } from '@contextgraph/types'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { IPipelineRunRepository, type PipelineRunListQuery } from './pipeline-run.repository'
import { type PipelineRunEntity } from './pipeline-run.entity'
import { entityToPipelineRunResponse } from './pipeline-run.mapper'
import { type PipelineRunResponseDto } from './pipeline-run.dto'
import type { PipelineRunListInput } from './pipeline-run.validation'
import {
  PIPELINE_VERSION,
  type CandidateExclusion,
  type ContextPackage,
  type ContextPackageCandidate,
  type PipelineMode,
  type PipelineRunMetrics,
  type PipelineStageResult,
  type PipelineTraceEntry,
} from '../contracts/context-pipeline.contracts'
import { PipelineRunNotCompletedException } from '../errors/pipeline-errors'

/** Everything the event store needs to persist one execution, immutable. */
export interface RecordPipelineRunInput {
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly actorId: EntityId
  readonly requestId: string
  readonly packageId: string | null
  readonly version: string
  readonly mode: PipelineMode
  readonly strategy: string
  readonly entryNodeId: EntityId
  readonly maxDepth: number
  readonly tokenBudget: number
  readonly maxCandidates: number
  readonly evaluatedAt: Timestamp
  readonly status: 'completed' | 'failed'
  readonly failedStageId: string | null
  /** The validated request as received — replay uses it verbatim. */
  readonly request: Metadata
  /** Ordered stage results (the execution trace), including failed stages. */
  readonly trace: readonly PipelineStageResult[]
  readonly metrics: PipelineRunMetrics | null
  readonly candidates: readonly ContextPackageCandidate[] | null
  readonly exclusions: readonly CandidateExclusion[] | null
  readonly error: { code: string; message: string } | null
  /** Tokens used by the final package (0 for failed runs). */
  readonly tokensUsed: number
  /** Client-supplied idempotency key (null when the request had none). */
  readonly idempotencyKey?: string | null
}

/**
 * Pipeline run event store — the query surface for historical executions.
 *
 * `record` is invoked by the orchestrator on every run (success or failure);
 * `findByRequestId`/`listByWorkspace` power audit and replay. Runs are
 * organization-scoped and immutable.
 */
export abstract class IPipelineRunService {
  abstract record(input: RecordPipelineRunInput): Promise<PipelineRunEntity>
  abstract findByRequestId(
    organizationId: EntityId,
    requestId: string,
  ): Promise<PipelineRunResponseDto>
  abstract listByWorkspace(
    organizationId: EntityId,
    query: PipelineRunListInput,
  ): Promise<PipelineRunResponseDto[]>
  /**
   * Resolves the requestId of a completed run recorded under a client
   * Idempotency-Key, or null — used by the pipeline to short-circuit retries.
   */
  abstract findCompletedByOrganizationAndKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<{ requestId: string } | null>
  /**
   * Rebuilds the ContextPackage of a completed run from its immutable
   * record — powers historical formatting and audit inspection.
   */
  abstract reconstructPackage(organizationId: EntityId, requestId: string): Promise<ContextPackage>
}

@Injectable()
export class PipelineRunService implements IPipelineRunService {
  constructor(
    @Inject(IPipelineRunRepository) private readonly repository: IPipelineRunRepository,
  ) {}

  async record(input: RecordPipelineRunInput): Promise<PipelineRunEntity> {
    return this.repository.record(input)
  }

  async findByRequestId(
    organizationId: EntityId,
    requestId: string,
  ): Promise<PipelineRunResponseDto> {
    const run = await this.repository.findByRequestId(organizationId, requestId)
    if (run === null) {
      throw new NotFoundException('Pipeline run not found')
    }
    return entityToPipelineRunResponse(run)
  }

  async listByWorkspace(
    organizationId: EntityId,
    query: PipelineRunListInput,
  ): Promise<PipelineRunResponseDto[]> {
    const listQuery: PipelineRunListQuery = {
      workspaceId: query.workspaceId,
      page: query.page,
      limit: query.limit,
    }
    const runs = await this.repository.findByWorkspace(organizationId, listQuery)
    return runs.map((run) => entityToPipelineRunResponse(run))
  }

  async findCompletedByOrganizationAndKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<{ requestId: string } | null> {
    return this.repository.findCompletedByOrganizationAndKey(organizationId, idempotencyKey)
  }

  async reconstructPackage(organizationId: EntityId, requestId: string): Promise<ContextPackage> {
    const run = await this.repository.findByRequestId(organizationId, requestId)
    if (run === null) {
      throw new NotFoundException('Pipeline run not found')
    }
    if (run.status !== 'completed' || run.metrics === null) {
      throw new PipelineRunNotCompletedException('Pipeline run has no package to format', {
        requestId,
        status: run.status,
      })
    }
    const trace = run.trace as readonly PipelineTraceEntry[]
    const metrics = run.metrics
    const summary = {
      requestId: run.requestId,
      packageId: run.packageId ?? '',
      version: run.version || PIPELINE_VERSION,
      mode: run.mode as PipelineMode,
      evaluatedAt: run.evaluatedAt,
      funnel: {
        reachable: metrics.reachableNodes,
        authorized: metrics.authorizedNodes,
        ruleCandidates: metrics.ruleCandidates,
        included: metrics.includedCandidates,
      },
      metrics,
      trace,
    }
    return {
      packageId: run.packageId ?? '',
      requestId: run.requestId,
      version: run.version || PIPELINE_VERSION,
      mode: run.mode as PipelineMode,
      workspaceId: run.workspaceId,
      entryNodeId: run.entryNodeId,
      strategy: run.strategy,
      evaluatedAt: run.evaluatedAt,
      generatedAt: run.createdAt,
      tokenBudget: run.tokenBudget,
      tokensUsed: run.tokensUsed,
      truncated: metrics.excludedByBudget > 0 || metrics.excludedByRank > 0,
      candidates: [...run.candidates],
      exclusions: [...run.exclusions],
      summary,
    }
  }
}
