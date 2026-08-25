/* Approval guardrail — determines if human approval is required for high-risk actions. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class ApprovalGuardrail extends IGuardrail {
  readonly id = 'approval'
  readonly name = 'Human Approval'
  readonly priority = 120

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // If the action definition itself requires approval.
    if (context.action.approvalRequired) {
      const riskInApprovalLevels = context.action.approvalRiskLevels.includes(
        context.action.riskLevel,
      )
      if (riskInApprovalLevels || context.action.approvalRiskLevels.length === 0) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.APPROVAL_REQUIRED,
          explanation: `Action "${context.action.name}" requires human approval`,
          severity: GuardrailSeverity.WARNING,
          metadata: { actionId: context.action.actionId, approvalRequired: true },
        }
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'No approval required',
      severity: GuardrailSeverity.INFO,
      metadata: { approvalRequired: false },
    }
  }
}
