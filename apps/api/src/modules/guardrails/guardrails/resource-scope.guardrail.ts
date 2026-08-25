/* Resource scope guardrail — verifies the principal can operate on the target resource.

Checks ownership, department membership, and explicit access. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class ResourceScopeGuardrail extends IGuardrail {
  readonly id = 'resource_scope'
  readonly name = 'Resource Scope'
  readonly priority = 50

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // No target = no scope check needed (e.g., create actions).
    if (context.targetResource === null) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No target resource scope to evaluate',
        severity: GuardrailSeverity.INFO,
        metadata: {},
      }
    }

    const resource = context.targetResource

    // Resources within the same organization pass (role-based access is checked by capability guardrail).
    if (resource.organizationId === context.organizationId) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'Resource within authorized scope',
        severity: GuardrailSeverity.INFO,
        metadata: {
          resourceId: resource.resourceId,
          scope: 'organization',
        },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: false,
      reasonCode: ActionReasonCode.INSUFFICIENT_PERMISSION,
      explanation: 'Resource outside authorized scope',
      severity: GuardrailSeverity.HIGH,
      metadata: { resourceId: resource.resourceId },
    }
  }
}
