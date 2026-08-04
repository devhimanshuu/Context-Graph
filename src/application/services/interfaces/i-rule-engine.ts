import { type ContextRule } from '@/domain/models'

/** Input to a rule evaluation. */
export interface EvaluateRuleInput {
  organizationId: string
  workspaceId: string | null
  rule: ContextRule
  /** The evaluation context (node attributes, caller attributes, ...). */
  context: Record<string, unknown>
}

/** Outcome of a single rule evaluation. */
export interface RuleEvaluation {
  ruleId: string
  fired: boolean
  /** What the rule produced when it fired (null when it did not fire). */
  output: Record<string, unknown> | null
}

/**
 * Deterministic rule engine contract. Evaluates `ContextRule.condition`
 * (a JSON expression tree) against a context and returns whether it fired
 * plus the rule's output. Pure and side-effect free so it can be re-run and
 * unit-tested in isolation.
 */
export interface IRuleEngine {
  evaluate(input: EvaluateRuleInput): Promise<RuleEvaluation>
}
