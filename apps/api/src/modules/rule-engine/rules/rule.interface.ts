import type { RuleReasonCode } from '../domain/reason-codes'
import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'

/**
 * The generic rule contract. Every pipeline rule:
 *
 *   - carries its `RuleDefinition` (id, priority, enabled, configuration);
 *   - evaluates ONE node against the immutable execution context; and
 *   - returns a structured, explainable result — never a bare boolean.
 *
 * A rule is a pure function of (context, node): no I/O, no clock, no shared
 * mutable state — identical inputs always yield identical results. New rules
 * plug into the pipeline factory without touching existing rules.
 */
export abstract class IRule {
  abstract readonly definition: RuleDefinition

  abstract evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult

  /** Shared helper producing a PASS result (keeps rule bodies focused). */
  protected pass(
    definition: RuleDefinition,
    node: RuleCandidateNode,
    evaluatedAt: string,
    reason: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): RuleEvaluationResult {
    return {
      ruleId: definition.id,
      nodeId: node.id,
      passed: true,
      reason,
      reasonCode: 'PASS',
      evaluatedAt,
      metadata,
    }
  }

  /** Shared helper producing a FAIL result with a stable reason code. */
  protected fail(
    definition: RuleDefinition,
    node: RuleCandidateNode,
    evaluatedAt: string,
    reasonCode: RuleReasonCode,
    reason: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): RuleEvaluationResult {
    return {
      ruleId: definition.id,
      nodeId: node.id,
      passed: false,
      reason,
      reasonCode,
      evaluatedAt,
      metadata,
    }
  }
}
