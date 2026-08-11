import { PermissionAction } from '@contextgraph/types'
import type { IAuthorizationEvaluator } from '../../authorization/evaluator/permission-evaluator'
import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import { candidateNodeToResourceContext } from '../rule-engine.mapper'
import { IRule } from './rule.interface'

/**
 * Permission re-verification. This rule does NOT re-implement authorization —
 * it delegates every node to the authorization engine's in-memory evaluator
 * over the already compiled context (zero I/O, O(1)-ish per node). The
 * authorization decision (including the failing policy) is preserved as
 * result metadata for explanations and audit.
 *
 * Because it runs over the whole working set, globally injected nodes are
 * covered too: a global node the caller may not read is removed here.
 */
export class PermissionRule extends IRule {
  constructor(
    readonly definition: RuleDefinition,
    private readonly evaluator: IAuthorizationEvaluator,
  ) {
    super()
  }

  evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    const decision = this.evaluator.evaluate(
      context.authorization,
      candidateNodeToResourceContext(node),
      PermissionAction.READ,
    )

    if (!decision.allowed) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'INSUFFICIENT_PERMISSION',
        decision.reason,
        {
          failedPolicy: decision.failedPolicy,
          authorizationReason: decision.reason,
          evaluatedPolicies: decision.evaluatedPolicies,
        },
      )
    }
    return this.pass(this.definition, node, context.evaluatedAt, 'READ authorized', {
      failedPolicy: null,
    })
  }
}
