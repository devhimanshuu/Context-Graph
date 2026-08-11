import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { IAuthorizationService } from '../../authorization/services/authorization.service'
import {
  DEFAULT_RULE_ENGINE_CONFIG,
  mergeRuleEngineConfig,
} from '../configuration/rule-engine.config'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEngineRequest, RuleEngineResponse } from '../domain/rule-engine-run'
import { RuleEngineLimitException } from '../errors/rule-engine-errors'
import { IRulePipelineFactory } from '../pipeline/rule-pipeline.factory'
import type { RulePipelineResult } from '../pipeline/rule-pipeline'
import { RULE_METRICS, type IRuleMetrics } from '../metrics/rule-metrics'
import { RULE_AUDIT_LOGGER, type IRuleAuditLogger } from '../audit/rule-audit-logger'

/** Application-facing surface of the deterministic rule engine. */
export abstract class IRuleEngineService {
  abstract execute(user: AuthenticatedUser, request: RuleEngineRequest): Promise<RuleEngineResponse>
  abstract getDefinition(): { version: number; stages: readonly string[] }
}

/**
 * Rule engine facade.
 *
 * Responsibilities:
 *   - compile the caller's authorization context ONCE (cached by the
 *     authorization engine) and reuse it for every node and every rule —
 *     the engine performs zero database queries per node;
 *   - resolve the pipeline for the (merged) configuration;
 *   - run the pipeline, then forward metrics and audit events through the
 *     platform seams.
 *
 * The tenant is derived from the server-compiled context — the request never
 * carries an organization identifier, so a misbuilt input set can only be
 * rejected by the isolation rule, never trusted.
 */
@Injectable()
export class RuleEngineService implements IRuleEngineService {
  constructor(
    @Inject(IAuthorizationService)
    private readonly authorization: IAuthorizationService,
    @Inject(IRulePipelineFactory)
    private readonly pipelineFactory: IRulePipelineFactory,
    @Inject(RULE_METRICS) private readonly metrics: IRuleMetrics,
    @Inject(RULE_AUDIT_LOGGER) private readonly audit: IRuleAuditLogger,
  ) {}

  async execute(user: AuthenticatedUser, request: RuleEngineRequest): Promise<RuleEngineResponse> {
    const config = mergeRuleEngineConfig(DEFAULT_RULE_ENGINE_CONFIG, request.config)
    if (request.nodes.length > config.maxNodes) {
      throw new RuleEngineLimitException(
        `Input node set (${request.nodes.length}) exceeds the configured limit (${config.maxNodes})`,
        { maxNodes: config.maxNodes },
      )
    }

    // Determinism: the evaluation instant is fixed here (once per run) and
    // injected — rules never read the clock.
    const evaluatedAt = request.evaluatedAt ?? new Date().toISOString()
    const authorization = await this.authorization.getContext(user)
    const pipeline = await this.pipelineFactory.getOrCreate(config)

    const context: RuleExecutionContext = {
      requestId: uuid(),
      user,
      authorization,
      organizationId: authorization.organizationId,
      workspaceId: request.workspaceId,
      entryNodeIds: request.entryNodeIds,
      nodes: request.nodes,
      evaluatedAt,
      config,
      executionMetadata: {},
    }

    const result = await pipeline.execute(context, request.nodes)

    await this.forwardAudit(context, request, result, evaluatedAt)
    this.metrics.recordRun(result.metrics)

    return {
      requestId: context.requestId,
      entryNodeIds: request.entryNodeIds,
      candidates: result.candidates,
      explanations: result.explanations,
      metrics: result.metrics,
      executedStages: result.executedStages,
    }
  }

  getDefinition(): { version: number; stages: readonly string[] } {
    return {
      version: 1,
      stages: DEFAULT_RULE_ENGINE_CONFIG.rules.map((rule) => rule.id),
    }
  }

  private async forwardAudit(
    context: RuleExecutionContext,
    request: RuleEngineRequest,
    result: RulePipelineResult,
    evaluatedAt: string,
  ): Promise<void> {
    const exclusions = result.explanations.filter((explanation) => !explanation.included)
    await Promise.all(
      exclusions.map((explanation) => {
        const failing = explanation.ruleResults.find((r) => !r.passed)
        return this.audit.recordExclusion({
          organizationId: context.organizationId,
          actorId: context.user.id,
          requestId: context.requestId,
          nodeId: explanation.nodeId,
          ruleId: failing?.ruleId ?? 'unknown',
          reasonCode: explanation.finalReasonCode ?? 'NOT_APPLICABLE',
          reason: failing?.reason ?? 'Removed by rule pipeline',
          evaluatedAt,
        })
      }),
    )
    await this.audit.recordPipelineRun({
      organizationId: context.organizationId,
      actorId: context.user.id,
      requestId: context.requestId,
      initialCount: result.metrics.initialCount,
      injectedCount: result.metrics.injectedCount,
      finalCount: result.metrics.finalCount,
      durationMs: result.metrics.totalDurationMs,
      evaluatedAt,
    })
  }
}
