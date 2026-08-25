/* Organization guardrail — ensures cross-tenant isolation.

The principal's organization must match the target resource's organization.
This is defense-in-depth — the Permission Engine also checks this. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class OrganizationGuardrail extends IGuardrail {
  readonly id = 'organization'
  readonly name = 'Organization Isolation'
  readonly priority = 30

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // If no target resource is resolved, the resource-not-found guardrail handles it.
    if (context.targetResource === null) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No target resource to check (resource existence handled elsewhere)',
        severity: GuardrailSeverity.INFO,
        metadata: {},
      }
    }

    if (context.targetResource.organizationId !== context.organizationId) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.ORG_SCOPE_VIOLATION,
        explanation: 'Cross-tenant action denied',
        severity: GuardrailSeverity.CRITICAL,
        metadata: {
          principalOrg: context.organizationId,
          targetOrg: context.targetResource.organizationId,
        },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'Organization scope valid',
      severity: GuardrailSeverity.INFO,
      metadata: { organizationId: context.organizationId },
    }
  }
}
