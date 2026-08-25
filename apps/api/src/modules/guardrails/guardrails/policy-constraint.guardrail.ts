/* Policy constraint guardrail — evaluates declarative policy constraints from the organization.

Uses the constraint engine to evaluate structured conditions against the action context.
Never executes arbitrary code — only evaluates declarative conditions. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import {
  IGuardrail,
  IConstraintEngine,
  IConstraintRepository,
} from '../domain/guardrails.interfaces'
import { Inject } from '@nestjs/common'

export class PolicyConstraintGuardrail extends IGuardrail {
  readonly id = 'policy_constraint'
  readonly name = 'Policy Constraints'
  readonly priority = 110

  constructor(
    @Inject(IConstraintRepository) private readonly constraintRepo: IConstraintRepository,
    @Inject(IConstraintEngine) private readonly constraintEngine: IConstraintEngine,
  ) {
    super()
  }

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    const constraints = await this.constraintRepo.findByOrganizationAndAction(
      context.organizationId,
      context.action.actionId,
    )

    if (constraints.length === 0) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No active constraints for this action',
        severity: GuardrailSeverity.INFO,
        metadata: { constraintCount: 0 },
      }
    }

    const results = await this.constraintEngine.evaluate(context, constraints)
    const { decision, reasonCode, reason } =
      this.constraintEngine.evaluateConflictResolution(results)

    if (decision === 'DENY') {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: reasonCode as ActionReasonCode,
        explanation: reason,
        severity: GuardrailSeverity.HIGH,
        metadata: { constraintCount: constraints.length, decision },
      }
    }

    if (decision === 'REQUIRES_APPROVAL') {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.APPROVAL_REQUIRED,
        explanation: reason,
        severity: GuardrailSeverity.WARNING,
        metadata: { constraintCount: constraints.length, decision },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'All policy constraints satisfied',
      severity: GuardrailSeverity.INFO,
      metadata: { constraintCount: constraints.length, decision },
    }
  }
}
