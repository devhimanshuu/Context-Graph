/* Resource existence guardrail — verifies the target resource exists. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class ResourceExistenceGuardrail extends IGuardrail {
  readonly id = 'resource_existence'
  readonly name = 'Resource Existence'
  readonly priority = 40

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // Actions without a specific target ID (e.g. CREATE) pass this guardrail.
    if (context.targetId === null) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No target ID required for this action',
        severity: GuardrailSeverity.INFO,
        metadata: {},
      }
    }

    if (context.targetResource === null) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.RESOURCE_NOT_FOUND,
        explanation: `Target resource not found or not accessible: ${context.targetId}`,
        severity: GuardrailSeverity.HIGH,
        metadata: { targetId: context.targetId, targetType: context.targetType },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'Target resource exists',
      severity: GuardrailSeverity.INFO,
      metadata: { resourceId: context.targetResource.resourceId },
    }
  }
}
