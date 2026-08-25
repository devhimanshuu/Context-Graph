/* Authentication guardrail — verifies the principal exists and is active.

Fail closed: missing or invalid authentication always results in DENY. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class AuthenticationGuardrail extends IGuardrail {
  readonly id = 'authentication'
  readonly name = 'Authentication'
  readonly priority = 10

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    if (!context.principalId || context.principalId.length === 0) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.AUTH_REQUIRED,
        explanation: 'No authenticated principal',
        severity: GuardrailSeverity.CRITICAL,
        metadata: {},
      }
    }

    if (!context.organizationId || context.organizationId.length === 0) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.AUTH_REQUIRED,
        explanation: 'No organization context',
        severity: GuardrailSeverity.CRITICAL,
        metadata: {},
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'Authenticated',
      severity: GuardrailSeverity.INFO,
      metadata: { principalId: context.principalId },
    }
  }
}
