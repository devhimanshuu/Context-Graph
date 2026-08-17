import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, EntityId, Timestamp } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { LOGGER, type ILogger } from '../../../common/interfaces/logger.interface'
import { IAuthorizationService } from '../../authorization/services/authorization.service'
import { IGraphService } from '../../graph/graph.service'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { IRuleEngineService } from '../../rule-engine/services/rule-engine.service'
import { knowledgeEntityToCandidateNode } from '../../rule-engine/mappers/knowledge-node.mapper'
import type { RuleCandidateNode } from '../../rule-engine/domain/candidate-node'
import { ICandidateBuilder } from '../../candidate/services/candidate-builder.service'
import { ICandidateRanker } from '../../candidate/services/candidate-ranker.service'
import type { KnowledgeNodeEntity } from '../../knowledge/knowledge.entity'
import { IContextBudget } from '../budget/context-budget'
import { ERROR_CODES } from '@contextgraph/shared'
import { IPipelineRunService, type RecordPipelineRunInput } from '../runs/pipeline-run.service'
import { PIPELINE_AUDIT, type IPipelineAuditLogger } from '../observability/pipeline-audit'
import { PIPELINE_METRICS, type IPipelineMetrics } from '../observability/pipeline-metrics'
import { NODE_TOKEN_OVERHEAD, estimateTokens } from '../context-assembly/context-token-budget'
import {
  DEFAULT_PIPELINE_CONFIG,
  mergePipelineConfig,
  type PipelineConfig,
} from '../configuration/pipeline.config'
import {
  PIPELINE_STAGE_ID,
  PIPELINE_STAGE_NAME,
  DEFAULT_PIPELINE_STAGES,
  PIPELINE_VERSION,
  type CandidateExclusion,
  type ContextPackage,
  type ContextPackageCandidate,
  type PipelineExecutionSummary,
  type PipelineMode,
  type PipelineRunMetrics,
  type PipelineStageId,
  type PipelineStageResult,
  type PipelineTraceEntry,
} from '../contracts/context-pipeline.contracts'
import {
  PipelineEntryResolutionException,
  PipelineTimeoutException,
  PipelineValidationException,
} from '../errors/pipeline-errors'
import type { ContextPipelineInput } from '../validation/context-pipeline.validation'

export interface ContextResolveOptions {
  /** Client-supplied Idempotency-Key: a completed run under the same key is
   *  returned without re-execution (deterministic replay semantics). */
  readonly idempotencyKey?: string | null
}

export abstract class IContextPipelineOrchestrator {
  abstract resolve(
    user: AuthenticatedUser,
    input: ContextPipelineInput,
    options?: ContextResolveOptions,
  ): Promise<ContextPackage>
  abstract getDefinition(): { version: string; stages: readonly string[] }
}

/**
 * Context pipeline orchestrator — Phase 7 composition boundary.
 *
 * Orchestrates the previously built engines WITHOUT reimplementing any of
 * them: authorization (Phase 5) compiles the trusted context once, the graph
 * engine (Phase 4) traverses + permission-filters, the rule engine (Phase 6)
 * filters with explanations (its stage 0 performs global knowledge
 * injection), the candidate module builds + deterministically ranks, and the
 * budget fits the survivors. No LLM, no per-node I/O, no business logic here.
 *
 * Determinism: the evaluation instant is captured once and injected into the
 * rule engine; ranking/budget use only the node data + that instant. Modes
 * gate how much detail is returned; security failures fail closed — a failed
 * stage never yields a partial package.
 */
@Injectable()
export class ContextPipelineOrchestrator implements IContextPipelineOrchestrator {
  constructor(
    @Inject(IAuthorizationService) private readonly authorization: IAuthorizationService,
    @Inject(IGraphService) private readonly graph: IGraphService,
    @Inject(IKnowledgeRepository) private readonly knowledge: IKnowledgeRepository,
    @Inject(IRuleEngineService) private readonly rules: IRuleEngineService,
    @Inject(ICandidateBuilder) private readonly builder: ICandidateBuilder,
    @Inject(ICandidateRanker) private readonly ranker: ICandidateRanker,
    @Inject(IContextBudget) private readonly budget: IContextBudget,
    @Inject(IPipelineRunService) private readonly runs: IPipelineRunService,
    @Inject(PIPELINE_METRICS) private readonly metrics: IPipelineMetrics,
    @Inject(PIPELINE_AUDIT) private readonly audit: IPipelineAuditLogger,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  getDefinition(): { version: string; stages: readonly string[] } {
    return { version: PIPELINE_VERSION, stages: DEFAULT_PIPELINE_STAGES }
  }

  async resolve(
    user: AuthenticatedUser,
    input: ContextPipelineInput,
    options?: ContextResolveOptions,
  ): Promise<ContextPackage> {
    // Idempotency: a completed run recorded under the client key is returned
    // verbatim (same request + evaluatedAt => deterministic content). Failed
    // runs are NOT short-circuited — the caller retries until success.
    const idempotencyKey = options?.idempotencyKey ?? null
    if (idempotencyKey !== null) {
      const existing = await this.runs.findCompletedByOrganizationAndKey(
        user.organizationId,
        idempotencyKey,
      )
      if (existing !== null) {
        return this.runs.reconstructPackage(user.organizationId, existing.requestId)
      }
    }

    // Determinism anchor: one evaluation instant for every stage and rule.
    const evaluatedAt: Timestamp = input.evaluatedAt ?? new Date().toISOString()
    const config = mergePipelineConfig(DEFAULT_PIPELINE_CONFIG, {
      mode: input.mode,
      maxCandidates: input.maxCandidates,
      tokenBudget: input.tokenBudget,
      stageTimeoutMs: input.stageTimeoutMs,
    })
    const mode = input.mode ?? config.defaultMode
    const requestId = uuid()
    const packageId = uuid()
    const runStartedAt = performance.now()
    const stages: PipelineStageResult[] = []

    // Stage-local runner: per-run closure (the orchestrator is a singleton —
    // never store per-request state on the class).
    const runStage = async <T>(
      stageId: PipelineStageId,
      fn: () => Promise<T>,
      counts: { input: number | null; output: (result: T) => number | null },
    ): Promise<T> => {
      const startedAt = new Date().toISOString()
      const stageStartedAt = performance.now()
      try {
        const result = await fn()
        const durationMs = performance.now() - stageStartedAt
        if (durationMs > config.stageTimeoutMs) {
          throw new PipelineTimeoutException('Pipeline stage exceeded its deadline', {
            stageId,
            timeoutMs: config.stageTimeoutMs,
          })
        }
        stages.push({
          stageId,
          stageName: PIPELINE_STAGE_NAME[stageId] ?? stageId,
          status: 'completed',
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs,
          inputCount: counts.input,
          outputCount: counts.output(result),
          metadata: {},
        })
        return result
      } catch (error) {
        stages.push({
          stageId,
          stageName: PIPELINE_STAGE_NAME[stageId] ?? stageId,
          status: 'failed',
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: performance.now() - stageStartedAt,
          inputCount: counts.input,
          outputCount: null,
          metadata: {},
        })
        throw error
      }
    }

    try {
      // 1. Request validation — sanity-check the merged configuration.
      await runStage(
        PIPELINE_STAGE_ID.VALIDATION,
        () => Promise.resolve(this.assertConfigBounds(config)),
        { input: 1, output: () => 1 },
      )

      // 2. Authorization — compile the trusted context (cached by the engine).
      await runStage(PIPELINE_STAGE_ID.AUTHORIZATION, () => this.authorization.getContext(user), {
        input: 1,
        output: () => 1,
      })

      // 3. Entry resolution — the entry node must exist in the caller's
      //    workspace. Workspace nodes load in ONE batched query (no N+1) and
      //    double as the entity source for the package content.
      const entities = await runStage(
        PIPELINE_STAGE_ID.ENTRY_RESOLUTION,
        () => this.knowledge.findByWorkspace(user.organizationId, input.workspaceId),
        { input: 1, output: (rows) => rows.length },
      )
      const entityById = new Map(entities.map((entity) => [entity.id, entity]))
      if (entityById.get(input.entryNodeId) === undefined) {
        throw new PipelineEntryResolutionException('Entry node not found in workspace', {
          workspaceId: input.workspaceId,
        })
      }

      // 4. Graph traversal — permission-filtered reachability (Phase 4).
      const reachability = await runStage(
        PIPELINE_STAGE_ID.GRAPH_TRAVERSAL,
        () =>
          this.graph.reachableNodes(user, input.workspaceId, {
            entryNodeId: input.entryNodeId,
            maxDepth: input.maxDepth,
            strategy: input.strategy,
          }),
        { input: 1, output: (result) => result.nodeIds.length },
      )

      // 5. Candidate mapping — adapt authorized nodes at the module boundary.
      const candidateNodes = await runStage(
        PIPELINE_STAGE_ID.CANDIDATE_MAPPING,
        async () => {
          const mapped: RuleCandidateNode[] = []
          for (const id of reachability.nodeIds) {
            const entity = entityById.get(id)
            if (entity === undefined) continue
            mapped.push(
              knowledgeEntityToCandidateNode(entity, {
                distance: reachability.distances[id] ?? 0,
              }),
            )
          }
          return mapped
        },
        {
          input: reachability.nodeIds.length,
          output: (rows) => rows.length,
        },
      )

      // 6. Rule engine — deterministic filtering + explanations (Phase 6).
      const ruleResult = await runStage(
        PIPELINE_STAGE_ID.RULE_ENGINE,
        () =>
          this.rules.execute(user, {
            workspaceId: input.workspaceId,
            entryNodeIds: [input.entryNodeId],
            nodes: candidateNodes,
            evaluatedAt,
          }),
        {
          input: candidateNodes.length,
          output: (result) => result.candidates.length,
        },
      )

      // 7. Candidate build — compression hints + dedup (Phase 7 candidate module).
      const built = await runStage(
        PIPELINE_STAGE_ID.CANDIDATE_BUILD,
        () =>
          this.builder.build({
            workspaceId: input.workspaceId,
            entryNodeId: input.entryNodeId,
            nodes: ruleResult.candidates,
            evaluatedAt,
          }),
        {
          input: ruleResult.candidates.length,
          output: (result) => result.candidates.length,
        },
      )

      // 8. Deterministic ranking + ceiling (Phase 7 candidate module). The
      //    pipeline-level maxCandidates is authoritative for the ceiling.
      const ranked = await runStage(
        PIPELINE_STAGE_ID.CANDIDATE_RANKING,
        () =>
          this.ranker.rank({
            candidates: built.candidates,
            entryNodeId: input.entryNodeId,
            config: { ...config.ranking, maxCandidates: config.maxCandidates },
            evaluatedAt,
          }),
        {
          input: built.candidates.length,
          output: (result) => result.candidates.length,
        },
      )

      // 9. Context budget — fit the ranked survivors (entry node guaranteed).
      const budgetItems = ranked.candidates.map((candidate) => {
        const content = entityById.get(candidate.nodeId)?.content ?? ''
        return {
          id: candidate.nodeId,
          importance: candidate.importance,
          distance: candidate.distance,
          tokens: estimateTokens(candidate.title) + estimateTokens(content) + NODE_TOKEN_OVERHEAD,
        }
      })
      const budgetResult = await runStage(
        PIPELINE_STAGE_ID.CONTEXT_BUDGET,
        () => this.budget.apply(budgetItems, config.tokenBudget, input.entryNodeId),
        {
          input: ranked.candidates.length,
          output: (result) => result.includedIds.length,
        },
      )

      // 10. Assemble the explainable, ranked, bounded package. The stage is
      //     recorded BEFORE finalization so the trace/metrics include it.
      const assembled = await runStage(
        PIPELINE_STAGE_ID.CONTEXT_PACKAGE,
        () =>
          Promise.resolve(
            this.assembleCandidates(
              input,
              config,
              mode,
              entityById,
              ruleResult,
              built,
              ranked,
              budgetResult,
            ),
          ),
        {
          input: budgetResult.includedIds.length,
          output: (result) => result.candidates.length,
        },
      )
      const pkg = this.finalizePackage(
        input,
        config,
        mode,
        evaluatedAt,
        requestId,
        packageId,
        reachability.nodeIds.length,
        candidateNodes.length,
        ruleResult,
        built,
        ranked,
        budgetResult,
        assembled,
        stages,
        runStartedAt,
      )

      await this.audit.recordRun({
        organizationId: user.organizationId,
        actorId: user.id,
        requestId,
        mode,
        workspaceId: input.workspaceId,
        entryNodeId: input.entryNodeId,
        reachableNodes: pkg.summary.metrics.reachableNodes,
        includedCandidates: pkg.summary.metrics.includedCandidates,
        durationMs: pkg.summary.metrics.totalDurationMs,
        evaluatedAt,
        failed: false,
        stageId: null,
      })
      await this.recordRun({
        user,
        input,
        mode,
        evaluatedAt,
        requestId,
        packageId,
        status: 'completed',
        failedStageId: null,
        stages,
        metrics: pkg.summary.metrics,
        candidates: pkg.candidates,
        exclusions: pkg.exclusions,
        error: null,
        tokensUsed: pkg.tokensUsed,
        idempotencyKey,
      })
      this.metrics.recordRun(mode, pkg.summary.metrics, false)

      this.logger.debug('Context pipeline resolved', {
        requestId,
        mode,
        funnel: pkg.summary.funnel,
        durationMs: pkg.summary.metrics.totalDurationMs,
      })

      return pkg
    } catch (error) {
      const failedStageId =
        stages
          .slice()
          .reverse()
          .find((stage) => stage.status === 'failed')?.stageId ?? null
      const durationMs = performance.now() - runStartedAt
      await this.audit.recordRun({
        organizationId: user.organizationId,
        actorId: user.id,
        requestId,
        mode,
        workspaceId: input.workspaceId,
        entryNodeId: input.entryNodeId,
        reachableNodes: 0,
        includedCandidates: 0,
        durationMs,
        evaluatedAt,
        failed: true,
        stageId: failedStageId,
      })
      await this.recordRun({
        user,
        input,
        mode,
        evaluatedAt,
        requestId,
        packageId: null,
        status: 'failed',
        failedStageId,
        stages,
        metrics: null,
        candidates: null,
        exclusions: null,
        tokensUsed: 0,
        error: {
          code:
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof (error as { code: unknown }).code === 'string'
              ? (error as { code: string }).code
              : ERROR_CODES.PIPELINE,
          message: error instanceof Error ? error.message : 'Pipeline execution failed',
        },
        idempotencyKey,
      })
      this.metrics.recordRun(
        mode,
        {
          totalDurationMs: durationMs,
          stagesExecuted: stages.filter((stage) => stage.status === 'completed').length,
          reachableNodes: 0,
          authorizedNodes: 0,
          injectedNodes: 0,
          ruleCandidates: 0,
          builtCandidates: 0,
          rankedCandidates: 0,
          includedCandidates: 0,
          excludedByRules: 0,
          excludedByBudget: 0,
          excludedByRank: 0,
          ruleEngineDurationMs: 0,
          stageDurationsMs: {},
        },
        true,
      )
      throw error
    }
  }

  /**
   * Persists one immutable execution record (success or failure) to the
   * pipeline-run event store. Failures never carry a partial package.
   */
  private async recordRun(input: {
    user: AuthenticatedUser
    input: ContextPipelineInput
    mode: PipelineMode
    evaluatedAt: Timestamp
    requestId: string
    packageId: string | null
    status: 'completed' | 'failed'
    failedStageId: string | null
    stages: readonly PipelineStageResult[]
    metrics: PipelineRunMetrics | null
    candidates: readonly ContextPackageCandidate[] | null
    exclusions: readonly CandidateExclusion[] | null
    error: { code: string; message: string } | null
    tokensUsed: number
    idempotencyKey: string | null
  }): Promise<void> {
    const record: RecordPipelineRunInput = {
      organizationId: input.user.organizationId,
      workspaceId: input.input.workspaceId,
      actorId: input.user.id,
      requestId: input.requestId,
      packageId: input.packageId,
      version: PIPELINE_VERSION,
      mode: input.mode,
      strategy: input.input.strategy ?? 'bfs',
      entryNodeId: input.input.entryNodeId,
      maxDepth: input.input.maxDepth ?? 32,
      tokenBudget: input.input.tokenBudget ?? 2048,
      maxCandidates: input.input.maxCandidates ?? 30,
      evaluatedAt: input.evaluatedAt,
      status: input.status,
      failedStageId: input.failedStageId,
      request: input.input as unknown as Record<string, unknown>,
      trace: input.stages,
      metrics: input.metrics,
      candidates: input.candidates,
      exclusions: input.exclusions,
      error: input.error,
      tokensUsed: input.tokensUsed,
      idempotencyKey: input.idempotencyKey,
    }
    await this.runs.record(record)
  }

  private buildMetrics(
    reachableNodes: number,
    authorizedNodes: number,
    ruleResult: Awaited<ReturnType<IRuleEngineService['execute']>>,
    builtCandidates: number,
    ranked: Awaited<ReturnType<ICandidateRanker['rank']>>,
    budgetResult: Awaited<ReturnType<IContextBudget['apply']>>,
    stages: readonly PipelineStageResult[],
    totalDurationMs: number,
  ): PipelineRunMetrics {
    const excludedByRules = ruleResult.explanations.filter(
      (explanation) => !explanation.included,
    ).length
    const excludedByRank = Math.max(0, builtCandidates - ranked.candidates.length)
    return {
      totalDurationMs,
      stagesExecuted: stages.filter((stage) => stage.status === 'completed').length,
      reachableNodes,
      authorizedNodes,
      injectedNodes: ruleResult.metrics.injectedCount,
      ruleCandidates: ruleResult.metrics.finalCount,
      builtCandidates,
      rankedCandidates: ranked.candidates.length,
      includedCandidates: budgetResult.includedIds.length,
      excludedByRules,
      excludedByBudget: budgetResult.excludedIds.length,
      excludedByRank,
      ruleEngineDurationMs: ruleResult.metrics.totalDurationMs,
      stageDurationsMs: Object.fromEntries(
        stages.map((stage) => [stage.stageId, stage.durationMs]),
      ),
    }
  }

  private buildSummary(
    requestId: string,
    packageId: string,
    mode: PipelineMode,
    evaluatedAt: Timestamp,
    metrics: PipelineRunMetrics,
    stages: readonly PipelineStageResult[],
  ): PipelineExecutionSummary {
    const trace: PipelineTraceEntry[] = stages.map((stage) => ({
      stageId: stage.stageId,
      stageName: stage.stageName,
      status: stage.status,
      outputCount: stage.outputCount,
      durationMs: stage.durationMs,
    }))
    return {
      requestId,
      packageId,
      version: PIPELINE_VERSION,
      mode,
      evaluatedAt,
      funnel: {
        reachable: metrics.reachableNodes,
        authorized: metrics.authorizedNodes,
        ruleCandidates: metrics.ruleCandidates,
        included: metrics.includedCandidates,
      },
      metrics,
      trace,
      stageResults: mode === 'STANDARD' ? undefined : stages,
    }
  }

  /** Defense-in-depth validation of the merged run configuration. */
  private assertConfigBounds(config: PipelineConfig): PipelineConfig {
    if (config.maxCandidates < 1 || !Number.isInteger(config.maxCandidates)) {
      throw new PipelineValidationException('maxCandidates must be a positive integer', {
        maxCandidates: config.maxCandidates,
      })
    }
    if (config.tokenBudget < 1) {
      throw new PipelineValidationException('tokenBudget must be positive', {
        tokenBudget: config.tokenBudget,
      })
    }
    if (config.stageTimeoutMs < 1) {
      throw new PipelineValidationException('stageTimeoutMs must be positive', {
        stageTimeoutMs: config.stageTimeoutMs,
      })
    }
    return config
  }

  /** Builds the candidate list + exclusion explanations for the package. */
  private assembleCandidates(
    input: ContextPipelineInput,
    config: PipelineConfig,
    mode: PipelineMode,
    entityById: Map<string, KnowledgeNodeEntity>,
    ruleResult: Awaited<ReturnType<IRuleEngineService['execute']>>,
    built: Awaited<ReturnType<ICandidateBuilder['build']>>,
    ranked: Awaited<ReturnType<ICandidateRanker['rank']>>,
    budgetResult: Awaited<ReturnType<IContextBudget['apply']>>,
  ): {
    candidates: ContextPackageCandidate[]
    exclusions: CandidateExclusion[]
    tokensUsed: number
    truncated: boolean
  } {
    const includedSet = new Set(budgetResult.includedIds)
    const candidates: ContextPackageCandidate[] = []
    const nodeTokens = new Map(
      ranked.candidates.map((candidate) => {
        const content = entityById.get(candidate.nodeId)?.content ?? ''
        return [
          candidate.nodeId,
          estimateTokens(candidate.title) + estimateTokens(content) + NODE_TOKEN_OVERHEAD,
        ]
      }),
    )
    for (const candidate of ranked.candidates) {
      if (!includedSet.has(candidate.nodeId)) continue
      candidates.push({
        candidateId: candidate.nodeId,
        title: candidate.title,
        content: entityById.get(candidate.nodeId)?.content ?? '',
        type: candidate.type,
        status: candidate.status,
        importance: candidate.importance,
        distance: candidate.distance,
        derivabilityScore: candidate.derivabilityScore,
        complianceTags: [...candidate.complianceTags],
        inclusionReason: candidate.inclusionReason,
        compressionHint: candidate.compressionHint,
        score: candidate.score,
        rank: candidate.rank,
        tokens: nodeTokens.get(candidate.nodeId) ?? 0,
      })
    }

    return {
      candidates,
      exclusions: this.buildExclusions(
        ruleResult,
        budgetResult,
        built.candidates,
        ranked.candidates,
        mode,
      ),
      tokensUsed: budgetResult.tokensUsed,
      truncated: budgetResult.truncated || ranked.truncated,
    }
  }

  /** Wraps the assembled content with the full execution summary + trace. */
  private finalizePackage(
    input: ContextPipelineInput,
    config: PipelineConfig,
    mode: PipelineMode,
    evaluatedAt: Timestamp,
    requestId: string,
    packageId: string,
    reachableCount: number,
    authorizedCount: number,
    ruleResult: Awaited<ReturnType<IRuleEngineService['execute']>>,
    built: Awaited<ReturnType<ICandidateBuilder['build']>>,
    ranked: Awaited<ReturnType<ICandidateRanker['rank']>>,
    budgetResult: Awaited<ReturnType<IContextBudget['apply']>>,
    assembled: {
      candidates: ContextPackageCandidate[]
      exclusions: CandidateExclusion[]
      tokensUsed: number
      truncated: boolean
    },
    stages: readonly PipelineStageResult[],
    runStartedAt: number,
  ): ContextPackage {
    const totalDurationMs = performance.now() - runStartedAt
    const metrics = this.buildMetrics(
      reachableCount,
      authorizedCount,
      ruleResult,
      built.candidates.length,
      ranked,
      budgetResult,
      stages,
      totalDurationMs,
    )
    const summary = this.buildSummary(requestId, packageId, mode, evaluatedAt, metrics, stages)

    return {
      packageId,
      requestId,
      version: PIPELINE_VERSION,
      mode,
      workspaceId: input.workspaceId,
      entryNodeId: input.entryNodeId,
      strategy: input.strategy,
      evaluatedAt,
      generatedAt: new Date().toISOString(),
      tokenBudget: config.tokenBudget,
      tokensUsed: assembled.tokensUsed,
      truncated: assembled.truncated,
      candidates: assembled.candidates,
      exclusions: assembled.exclusions,
      summary,
    }
  }

  private buildExclusions(
    ruleResult: Awaited<ReturnType<IRuleEngineService['execute']>>,
    budgetResult: Awaited<ReturnType<IContextBudget['apply']>>,
    built: readonly { nodeId: EntityId }[],
    ranked: readonly { nodeId: EntityId }[],
    mode: PipelineMode,
  ): CandidateExclusion[] {
    const debug = mode !== 'STANDARD'
    const exclusions: CandidateExclusion[] = []

    // Rule-removed nodes, with their failing rule and reason.
    for (const explanation of ruleResult.explanations) {
      if (explanation.included) continue
      exclusions.push({
        nodeId: explanation.nodeId,
        included: false,
        finalReasonCode: explanation.finalReasonCode,
        failingRuleId: explanation.failingRuleId,
        excludedByBudget: false,
        ...(debug
          ? {
              ruleResults: explanation.ruleResults.map((verdict) => ({
                ruleId: verdict.ruleId,
                passed: verdict.passed,
                reasonCode: verdict.reasonCode,
                reason: verdict.reason,
              })),
            }
          : {}),
      })
    }

    // Budget-cut nodes (passed every rule, did not fit the token budget).
    for (const id of budgetResult.excludedIds) {
      exclusions.push({
        nodeId: id,
        included: false,
        finalReasonCode: null,
        failingRuleId: null,
        excludedByBudget: true,
      })
    }

    // Rank-cut nodes (passed every rule, cut by the maxCandidates ceiling).
    const rankedSet = new Set(ranked.map((candidate) => candidate.nodeId))
    for (const candidate of built) {
      if (rankedSet.has(candidate.nodeId)) continue
      exclusions.push({
        nodeId: candidate.nodeId,
        included: false,
        finalReasonCode: null,
        failingRuleId: null,
        excludedByBudget: false,
        excludedByRank: true,
      })
    }

    return exclusions
  }
}
