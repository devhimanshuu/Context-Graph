import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, Timestamp } from '@contextgraph/types'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleCandidateNode } from '../domain/candidate-node'
import { IRuleEngineService } from '../services/rule-engine.service'
import { knowledgeEntityToCandidateNode } from '../mappers/knowledge-node.mapper'
import type { RuleRunInput } from './rule-run.validation'
import type { RuleRunResponseDto } from './rule-run.dto'

export abstract class IRuleRunService {
  abstract run(user: AuthenticatedUser, input: RuleRunInput): Promise<RuleRunResponseDto>
}

/**
 * REST surface for the rule engine.
 *
 * The engine itself stays pure and I/O-free; this thin application service
 * resolves the requested node ids from the workspace (one batched query,
 * server-authoritative), maps them with `EXPLICIT_CONTEXT` inclusion, runs
 * the engine, and returns the full funnel plus per-node reasons.
 */
@Injectable()
export class RuleRunService implements IRuleRunService {
  constructor(
    @Inject(IKnowledgeRepository) private readonly knowledge: IKnowledgeRepository,
    @Inject(IRuleEngineService) private readonly engine: IRuleEngineService,
  ) {}

  async run(user: AuthenticatedUser, input: RuleRunInput): Promise<RuleRunResponseDto> {
    const evaluatedAt: Timestamp = input.evaluatedAt ?? new Date().toISOString()
    const entryNodeIds = input.entryNodeIds ?? []
    const workspaceNodes = await this.knowledge.findByWorkspace(
      user.organizationId,
      input.workspaceId,
    )
    const byId = new Map(workspaceNodes.map((node) => [node.id, node]))

    // Resolve the requested set in deterministic (request) order, skipping ids
    // that do not exist in this workspace. Node data is never client-supplied.
    const nodes: RuleCandidateNode[] = []
    for (const id of input.nodeIds) {
      const entity = byId.get(id)
      if (entity === undefined) continue
      nodes.push(
        knowledgeEntityToCandidateNode(entity, {
          distance: null,
          inclusionReason: InclusionReason.EXPLICIT_CONTEXT,
        }),
      )
    }
    if (nodes.length === 0) {
      throw new NotFoundException('None of the requested nodes exist in this workspace')
    }

    const result = await this.engine.execute(user, {
      workspaceId: input.workspaceId,
      entryNodeIds,
      nodes,
      evaluatedAt,
    })

    return {
      requestId: result.requestId,
      entryNodeIds: [...entryNodeIds],
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type,
        status: node.status,
      })),
      candidates: result.candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        status: candidate.status,
        importance: candidate.importance,
        complianceTags: [...candidate.complianceTags],
      })),
      explanations: result.explanations.map((explanation) => ({
        nodeId: explanation.nodeId,
        included: explanation.included,
        finalReasonCode: explanation.finalReasonCode,
        failingRuleId: explanation.failingRuleId,
        ruleResults: explanation.ruleResults.map((verdict) => ({
          ruleId: verdict.ruleId,
          passed: verdict.passed,
          reasonCode: verdict.reasonCode,
          reason: verdict.reason,
        })),
      })),
      metrics: {
        initialCount: result.metrics.initialCount,
        injectedCount: result.metrics.injectedCount,
        finalCount: result.metrics.finalCount,
        totalDurationMs: result.metrics.totalDurationMs,
        countsAfterStage: result.metrics.countsAfterStage.map((stage) => ({
          stageId: stage.stageId,
          count: stage.count,
        })),
        removedByRule: { ...result.metrics.removedByRule },
        removedByReason: { ...result.metrics.removedByReason },
        ruleDurationsMs: { ...result.metrics.ruleDurationsMs },
      },
      executedStages: [...result.executedStages],
    }
  }
}
