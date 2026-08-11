import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import type { IDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { IRule } from './rule.interface'

/**
 * Context compression: drops generic content that a foundation model could
 * derive itself, preserving organization-specific knowledge. Delegates the
 * classification to the (swappable) derivability evaluator — this rule only
 * translates the decision into a structured pass/fail.
 */
export class DerivabilityRule extends IRule {
  constructor(
    readonly definition: RuleDefinition,
    private readonly evaluator: IDerivabilityEvaluator,
  ) {
    super()
  }

  evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    const decision = this.evaluator.evaluate(node, this.definition.configuration)

    if (decision.derivable) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'DERIVABLE_CONTENT',
        'Content is derivable by a foundation model',
        {
          derivabilityReason: decision.reason,
          derivabilityScore: decision.score,
        },
      )
    }
    return this.pass(
      this.definition,
      node,
      context.evaluatedAt,
      'Organization-specific knowledge preserved',
      {
        derivabilityReason: decision.reason,
        derivabilityScore: decision.score,
      },
    )
  }
}
