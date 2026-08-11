import type { ComplianceTag } from '@contextgraph/types'
import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import { IRule } from './rule.interface'

/**
 * Deterministic compliance filtering. Every tag a node demands must be
 * covered by the principal's effective clearance tags from the ALREADY
 * COMPILED authorization context — no database access, O(tags) per node.
 *
 * This is a defense-in-depth re-check: the permission engine remains the
 * source of authorization truth; this rule guarantees the same boundary holds
 * inside the candidate set (including globally injected nodes).
 */
export class ComplianceRule extends IRule {
  constructor(readonly definition: RuleDefinition) {
    super()
  }

  evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    const required = node.complianceTags
    if (required.length === 0) {
      // No tags → the rule does not apply, but the node still passes.
      return this.pass(this.definition, node, context.evaluatedAt, 'No compliance tags required', {
        applicable: false,
      })
    }

    const effective = context.authorization.effectiveComplianceTags
    const missing = required.filter((tag: ComplianceTag) => !effective.has(tag))
    if (missing.length > 0) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'MISSING_CLEARANCE',
        'Missing required compliance clearance',
        { missingTags: missing, requiredTags: [...required] },
      )
    }
    return this.pass(this.definition, node, context.evaluatedAt, 'All compliance tags cleared')
  }
}
