import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import {
  EMPTY_REASON_COUNTS,
  type RuleExecutionMetrics,
  type RuleStageCount,
} from '../domain/rule-execution-metrics'
import type { NodeRuleExplanation } from '../domain/rule-engine-run'
import type { RuleReasonCode } from '../domain/reason-codes'
import { RULE_ID } from '../configuration/rule-ids'
import { compareRuleDefinitions } from '../configuration/rule-engine.config'
import type { IGlobalKnowledgeInjector } from '../injectors/global-knowledge.injector'
import { IRule } from '../rules/rule.interface'

/** A node with its accumulated per-rule evaluations. */
interface WorkingNode {
  readonly node: RuleCandidateNode
  readonly results: RuleEvaluationResult[]
}

/** Full pipeline outcome (consumed by the service). */
export interface RulePipelineResult {
  readonly candidates: readonly RuleCandidateNode[]
  readonly explanations: readonly NodeRuleExplanation[]
  readonly metrics: RuleExecutionMetrics
  readonly executedStages: readonly string[]
}

/**
 * The deterministic rule pipeline.
 *
 * Execution model (rule-major):
 *   1. stage 0 — global injection merges globally relevant nodes (deduped);
 *   2. each enabled rule (sorted by priority, then id) passes over the
 *      surviving set once; failures remove the node forever;
 *   3. every node accumulates a RuleEvaluationResult per rule — a removed
 *      node can never reappear, and every exclusion carries its reason.
 *
 * Rules receive the immutable context and are pure: no I/O, no clock, no
 * shared state. Complexity: O(V × R) evaluations with O(V) memory, where V is
 * the (deduplicated, injected) node count and R the enabled rule count.
 */
export class RulePipeline {
  private readonly rules: readonly IRule[]

  constructor(
    private readonly injector: IGlobalKnowledgeInjector,
    rules: readonly IRule[],
  ) {
    // Ordering is enforced HERE, not by the caller: priority ascending, then
    // id ascending — construction order and array position are irrelevant.
    this.rules = [...rules].sort((a, b) => compareRuleDefinitions(a.definition, b.definition))
  }

  async execute(
    context: RuleExecutionContext,
    nodes: readonly RuleCandidateNode[],
  ): Promise<RulePipelineResult> {
    const startedAt = performance.now()

    // Deduplicate input deterministically (first occurrence wins).
    const input = dedupeNodes(nodes)

    // Stage 0: global knowledge injection.
    const injected = await this.injector.inject(context, input)

    const all: WorkingNode[] = injected.map((node) => ({ node, results: [] }))
    const surviving = new Set<string>(all.map((entry) => entry.node.id))

    const stageCounts: RuleStageCount[] = [
      { stageId: RULE_ID.GLOBAL_INJECTION, count: injected.length },
    ]
    const removedByRule: Record<string, number> = {}
    const removedByReason: Record<string, number> = { ...EMPTY_REASON_COUNTS }
    const ruleDurationsMs: Record<string, number> = {}
    const executedStages: string[] = [RULE_ID.GLOBAL_INJECTION]

    for (const rule of this.rules) {
      if (!rule.definition.enabled) continue
      const ruleStartedAt = performance.now()

      for (const entry of all) {
        if (!surviving.has(entry.node.id)) continue
        const result = rule.evaluate(context, entry.node)
        entry.results.push(result)
        if (!result.passed) {
          surviving.delete(entry.node.id)
          removedByRule[rule.definition.id] = (removedByRule[rule.definition.id] ?? 0) + 1
          removedByReason[result.reasonCode] = (removedByReason[result.reasonCode] ?? 0) + 1
        }
      }

      ruleDurationsMs[rule.definition.id] = performance.now() - ruleStartedAt
      stageCounts.push({ stageId: rule.definition.id, count: surviving.size })
      executedStages.push(rule.definition.id)
    }

    const candidates = all
      .filter((entry) => surviving.has(entry.node.id))
      .map((entry) => entry.node)

    const explanations: NodeRuleExplanation[] = all.map((entry) => {
      const lastFailure = lastFailedResult(entry.results)
      return {
        nodeId: entry.node.id,
        included: surviving.has(entry.node.id),
        finalReasonCode: lastFailure?.reasonCode ?? null,
        failingRuleId: lastFailure?.ruleId ?? null,
        ruleResults: entry.results,
      }
    })

    const metrics: RuleExecutionMetrics = {
      initialCount: input.length,
      injectedCount: injected.length - input.length,
      finalCount: candidates.length,
      totalDurationMs: performance.now() - startedAt,
      countsAfterStage: stageCounts,
      removedByRule,
      removedByReason,
      ruleDurationsMs,
    }

    return { candidates, explanations, metrics, executedStages }
  }
}

/** First occurrence wins; duplicates are dropped before any rule runs. */
function dedupeNodes(nodes: readonly RuleCandidateNode[]): RuleCandidateNode[] {
  const seen = new Set<string>()
  const unique: RuleCandidateNode[] = []
  for (const node of nodes) {
    if (seen.has(node.id)) continue
    seen.add(node.id)
    unique.push(node)
  }
  return unique
}

function lastFailedResult(results: readonly RuleEvaluationResult[]): {
  reasonCode: RuleReasonCode
  ruleId: string
} | null {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index]
    if (result !== undefined && !result.passed) {
      return { reasonCode: result.reasonCode, ruleId: result.ruleId }
    }
  }
  return null
}
