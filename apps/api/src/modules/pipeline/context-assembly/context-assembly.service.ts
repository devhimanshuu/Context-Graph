import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, Timestamp } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { IGraphService } from '../../graph/graph.service'
import { IRuleEngineService } from '../../rule-engine/services/rule-engine.service'
import type { RuleCandidateNode } from '../../rule-engine/domain/candidate-node'
import { knowledgeEntityToCandidateNode } from '../../rule-engine/mappers/knowledge-node.mapper'
import type { ContextAssemblyInput } from './context-assembly.validation'
import { estimateTokens, fitToBudget, NODE_TOKEN_OVERHEAD } from './context-token-budget'
import type { ContextAssemblyResponseDto } from './context-assembly.dto'

export abstract class IContextAssemblyService {
  abstract assemble(
    user: AuthenticatedUser,
    input: ContextAssemblyInput,
  ): Promise<ContextAssemblyResponseDto>
}

/**
 * Context assembly — the composition boundary of the platform.
 *
 * Orchestrates the three engines WITHOUT reimplementing any of them:
 *
 *   Graph (Phase 4)    reachability from the entry node, permission-filtered
 *   Rules (Phase 6)    deterministic filtering over the authorized set
 *   Budget (Phase 7)   deterministic token budgeting over the survivors
 *
 * The graph service returns only nodes the caller may read (authorization is
 * compiled once and reused across the batch); the rule engine re-verifies
 * every node against the same compiled context and produces per-node
 * explanations; the budget fitter is pure and deterministic, so identical
 * inputs produce byte-identical packages. No LLM, no I/O per node.
 */
@Injectable()
export class ContextAssemblyService implements IContextAssemblyService {
  constructor(
    @Inject(IGraphService) private readonly graph: IGraphService,
    @Inject(IKnowledgeRepository) private readonly knowledge: IKnowledgeRepository,
    @Inject(IRuleEngineService) private readonly rules: IRuleEngineService,
  ) {}

  async assemble(
    user: AuthenticatedUser,
    input: ContextAssemblyInput,
  ): Promise<ContextAssemblyResponseDto> {
    // Fixed evaluation instant, captured once and shared with the rule engine
    // so the response and every rule verdict agree (determinism).
    const evaluatedAt: Timestamp = input.evaluatedAt ?? new Date().toISOString()

    // 1. Reachability + permission filtering (graph engine).
    const reachability = await this.graph.reachableNodes(user, input.workspaceId, {
      entryNodeId: input.entryNodeId,
      maxDepth: input.maxDepth,
      strategy: input.strategy,
    })

    // 2. Full entities for the authorized set — one batched query.
    const entities = await this.knowledge.findByWorkspace(user.organizationId, input.workspaceId)
    const entityById = new Map(entities.map((entity) => [entity.id, entity]))

    const candidateNodes: RuleCandidateNode[] = []
    for (const id of reachability.nodeIds) {
      const entity = entityById.get(id)
      if (entity === undefined) continue // defensive: projection without an entity
      candidateNodes.push(
        knowledgeEntityToCandidateNode(entity, { distance: reachability.distances[id] ?? 0 }),
      )
    }

    // 3. Rule engine — deterministic filtering with explanations.
    const ruleResult = await this.rules.execute(user, {
      workspaceId: input.workspaceId,
      entryNodeIds: [input.entryNodeId],
      nodes: candidateNodes,
      evaluatedAt,
    })

    // 4. Token budgeting over the rule-passing candidates.
    const rulePassing = ruleResult.candidates
    const budget = rulePassing.map((candidate) => {
      const content = entityById.get(candidate.id)?.content ?? ''
      return {
        id: candidate.id,
        importance: candidate.importance,
        distance: candidate.distance ?? null,
        tokens: estimateTokens(candidate.title) + estimateTokens(content) + NODE_TOKEN_OVERHEAD,
      }
    })
    const fit = fitToBudget(budget, input.tokenBudget, input.entryNodeId)
    const includedSet = new Set(fit.includedIds)
    const budgetCutSet = new Set(fit.excludedIds)

    const nodeTokens = new Map(budget.map((candidate) => [candidate.id, candidate.tokens]))

    // 5. Assemble the response.
    return {
      packageId: uuid(),
      requestId: ruleResult.requestId,
      entryNodeId: input.entryNodeId,
      workspaceId: input.workspaceId,
      strategy: input.strategy,
      evaluatedAt,
      tokenBudget: input.tokenBudget,
      tokensUsed: fit.tokensUsed,
      truncated: fit.truncated,
      funnel: {
        reachable: candidateNodes.length,
        candidates: ruleResult.metrics.finalCount,
        included: fit.includedIds.length,
      },
      nodes: candidateNodes.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        status: candidate.status,
        importance: candidate.importance,
        distance: candidate.distance ?? 0,
        derivabilityScore: candidate.derivabilityScore,
        tokens: nodeTokens.get(candidate.id) ?? 0,
        included: includedSet.has(candidate.id),
        excludedByBudget: budgetCutSet.has(candidate.id),
      })),
      candidates: rulePassing
        .filter((candidate) => includedSet.has(candidate.id))
        .map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          content: entityById.get(candidate.id)?.content ?? '',
          type: candidate.type,
          status: candidate.status,
          importance: candidate.importance,
          distance: candidate.distance ?? 0,
          derivabilityScore: candidate.derivabilityScore,
          complianceTags: [...candidate.complianceTags],
          tokens: nodeTokens.get(candidate.id) ?? 0,
          included: true,
          excludedByBudget: false,
        })),
      explanations: ruleResult.explanations.map((explanation) => ({
        nodeId: explanation.nodeId,
        included: explanation.included,
        finalReasonCode: explanation.finalReasonCode,
        failingRuleId: explanation.failingRuleId,
        ruleResults: explanation.ruleResults.map((result) => ({
          ruleId: result.ruleId,
          passed: result.passed,
          reasonCode: result.reasonCode,
          reason: result.reason,
        })),
      })),
      executedStages: [...ruleResult.executedStages],
      metrics: {
        initialCount: ruleResult.metrics.initialCount,
        injectedCount: ruleResult.metrics.injectedCount,
        finalCount: ruleResult.metrics.finalCount,
        totalDurationMs: ruleResult.metrics.totalDurationMs,
      },
    }
  }
}
