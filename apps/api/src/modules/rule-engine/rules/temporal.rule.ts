import { NodeStatus } from '@contextgraph/types'
import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleDefinition } from '../domain/rule-definition'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleEvaluationResult } from '../domain/rule-result'
import { IRule } from './rule.interface'

/**
 * Deterministic temporal validity.
 *
 * Semantics (documented in docs/rule-engine.md):
 *   - Validity window is INCLUSIVE on both ends: valid iff
 *     (validFrom == null || validFrom <= evaluatedAt) &&
 *     (validTo   == null || validTo   >= evaluatedAt).
 *   - All timestamps are UTC ISO-8601; comparison uses their epoch millis so
 *     there is no timezone ambiguity. The evaluation instant is injected in
 *     the context — rules never read the server clock.
 *   - SUPERSEDED → removed (SUPERSEDED_NODE); a newer version exists.
 *   - EXPIRED → removed (EXPIRED_NODE).
 *   - DRAFT / ARCHIVED → removed (NOT_ACTIVE): drafts are unpublished
 *     knowledge and archived nodes are retired (fail-secure default).
 *   - LEGAL_HOLD → kept regardless of the window (legal hold overrides
 *     expiry, configurable via `legalHoldOverridesExpiry`).
 *   - REVIEW_REQUIRED → kept (still valid) but flagged in result metadata.
 *   - ACTIVE → subject to the window bounds (FUTURE_EFFECTIVE_NODE /
 *     EXPIRED_NODE).
 */
export class TemporalRule extends IRule {
  constructor(readonly definition: RuleDefinition) {
    super()
  }

  evaluate(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    switch (node.status) {
      case NodeStatus.SUPERSEDED:
        return this.fail(
          this.definition,
          node,
          context.evaluatedAt,
          'SUPERSEDED_NODE',
          'Node has been superseded by a newer version',
        )
      case NodeStatus.EXPIRED:
        return this.fail(
          this.definition,
          node,
          context.evaluatedAt,
          'EXPIRED_NODE',
          'Node status is EXPIRED',
        )
      case NodeStatus.DRAFT:
        return this.fail(
          this.definition,
          node,
          context.evaluatedAt,
          'NOT_ACTIVE',
          'Draft nodes are not published knowledge',
        )
      case NodeStatus.ARCHIVED:
        return this.fail(
          this.definition,
          node,
          context.evaluatedAt,
          'NOT_ACTIVE',
          'Archived nodes are retired from context',
        )
      case NodeStatus.LEGAL_HOLD:
        return this.legalHold(context, node)
      case NodeStatus.REVIEW_REQUIRED:
        return this.windowCheck(context, node, { reviewRequired: true })
      case NodeStatus.ACTIVE:
        return this.windowCheck(context, node, {})
    }
  }

  private legalHold(context: RuleExecutionContext, node: RuleCandidateNode): RuleEvaluationResult {
    const overridesExpiry =
      this.definition.configuration['legalHoldOverridesExpiry'] === false ? false : true
    if (overridesExpiry) {
      return this.pass(
        this.definition,
        node,
        context.evaluatedAt,
        'Legal hold — node must remain retrievable',
        { legalHold: true, legalHoldOverridesExpiry: true },
      )
    }
    return this.windowCheck(context, node, { legalHold: true })
  }

  private windowCheck(
    context: RuleExecutionContext,
    node: RuleCandidateNode,
    metadata: Readonly<Record<string, unknown>>,
  ): RuleEvaluationResult {
    const evaluatedMs = Date.parse(context.evaluatedAt)

    if (node.validFrom !== null && Date.parse(node.validFrom) > evaluatedMs) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'FUTURE_EFFECTIVE_NODE',
        'Node is not yet effective (validFrom lies in the future)',
        { validFrom: node.validFrom },
      )
    }
    if (node.validTo !== null && Date.parse(node.validTo) < evaluatedMs) {
      return this.fail(
        this.definition,
        node,
        context.evaluatedAt,
        'EXPIRED_NODE',
        'Node validity window has closed',
        { validTo: node.validTo },
      )
    }
    return this.pass(
      this.definition,
      node,
      context.evaluatedAt,
      'Node is temporally valid',
      metadata,
    )
  }
}
