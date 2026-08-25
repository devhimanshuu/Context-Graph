/* Compliance guardrail — verifies the principal has required compliance clearance for the action. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

const CLEARANCE_HIERARCHY: Record<string, number> = {
  NONE: 0,
  STANDARD: 1,
  SENSITIVE: 2,
  RESTRICTED: 3,
  CRITICAL: 4,
}

/** Actions that target restricted data requiring enhanced clearance. */
const RESTRICTED_ACTIONS = new Set(['SEND_EXTERNAL_MESSAGE', 'APPROVE_OPERATION'])

export class ComplianceGuardrail extends IGuardrail {
  readonly id = 'compliance'
  readonly name = 'Compliance Clearance'
  readonly priority = 70

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // If the target has compliance tags, check against principal clearance.
    if (
      context.targetResource !== null &&
      context.targetResource.metadata !== null &&
      'complianceTags' in context.targetResource.metadata
    ) {
      const tags = (context.targetResource.metadata as Record<string, unknown>)
        .complianceTags as string[]
      const needsRestricted =
        tags !== undefined &&
        (tags.includes('RESTRICTED') || tags.includes('PHI') || tags.includes('PII'))
      const needsSensitive = tags !== undefined && tags.includes('CONFIDENTIAL')

      const principalClearance = CLEARANCE_HIERARCHY[context.complianceClearance] ?? 0

      if (needsRestricted && principalClearance < (CLEARANCE_HIERARCHY['RESTRICTED'] ?? 0)) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.MISSING_CLEARANCE,
          explanation: `Compliance clearance ${context.complianceClearance} insufficient for restricted content`,
          severity: GuardrailSeverity.HIGH,
          metadata: { required: 'RESTRICTED', actual: context.complianceClearance, tags },
        }
      }

      if (needsSensitive && principalClearance < (CLEARANCE_HIERARCHY['SENSITIVE'] ?? 0)) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.MISSING_CLEARANCE,
          explanation: `Compliance clearance ${context.complianceClearance} insufficient for sensitive content`,
          severity: GuardrailSeverity.HIGH,
          metadata: { required: 'SENSITIVE', actual: context.complianceClearance, tags },
        }
      }
    }

    // Certain high-risk actions require at least STANDARD clearance.
    if (RESTRICTED_ACTIONS.has(context.action.actionId)) {
      const principalClearance = CLEARANCE_HIERARCHY[context.complianceClearance] ?? 0
      if (principalClearance < (CLEARANCE_HIERARCHY['STANDARD'] ?? 0)) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.MISSING_CLEARANCE,
          explanation: `Action requires at least STANDARD compliance clearance`,
          severity: GuardrailSeverity.HIGH,
          metadata: { required: 'STANDARD', actual: context.complianceClearance },
        }
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'Compliance clearance sufficient',
      severity: GuardrailSeverity.INFO,
      metadata: { clearance: context.complianceClearance },
    }
  }
}
