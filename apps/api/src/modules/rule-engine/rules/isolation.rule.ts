import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import { IRule } from './rule.interface'

/**
 * Defense-in-depth tenant boundary. The permission engine is the primary
 * isolation gate; this rule re-verifies the node's owning organization against
 * the server-derived tenant of the execution context, so a foreign node can
 * never enter the candidate set even if the input set is misbuilt.
 *
 * Missing organization identifiers fail closed (ORG_MISMATCH).
 */
export class IsolationRule extends IRule {
  constructor(readonly definition: RuleDefinition) {
    super()
  }

  evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    if (node.organizationId !== context.organizationId) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'ORG_MISMATCH',
        'Node belongs to another organization',
        {
          nodeOrganizationId: node.organizationId,
          contextOrganizationId: context.organizationId,
        },
      )
    }
    return this.pass(this.definition, node, context.evaluatedAt, 'Organization matches')
  }
}
