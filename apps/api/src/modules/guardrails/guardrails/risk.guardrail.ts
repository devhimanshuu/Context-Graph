/* Risk guardrail — evaluates the action's risk level against controls and thresholds. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode, GuardrailRiskLevel } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class RiskGuardrail extends IGuardrail {
  readonly id = 'risk'
  readonly name = 'Action Risk'
  readonly priority = 100

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    const riskLevel = context.action.riskLevel

    // CRITICAL risk actions always require elevated scrutiny.
    if (riskLevel === GuardrailRiskLevel.CRITICAL) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.RISK_EXCEEDED,
        explanation: `CRITICAL risk action requires human approval`,
        severity: GuardrailSeverity.CRITICAL,
        metadata: { riskLevel, actionId: context.action.actionId },
      }
    }

    // HIGH risk actions pass but flag as needing policy review.
    if (riskLevel === GuardrailRiskLevel.HIGH) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: `HIGH risk action — additional policy evaluation applies`,
        severity: GuardrailSeverity.WARNING,
        metadata: { riskLevel },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: `Risk level ${riskLevel} is within acceptable bounds`,
      severity: GuardrailSeverity.INFO,
      metadata: { riskLevel },
    }
  }
}
