/* Classification guardrail — evaluates resource data classification against the action. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode, ResourceClassification } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

const CLASSIFICATION_HIERARCHY: Record<string, number | undefined> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
} as const

/** Actions that cannot target RESTRICTED resources without approval. */
const EXTERNAL_BLOCKING_ACTIONS = new Set(['SEND_EXTERNAL_MESSAGE'])

export class ClassificationGuardrail extends IGuardrail {
  readonly id = 'classification'
  readonly name = 'Data Classification'
  readonly priority = 80

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    const classification: string = (context.targetResource?.classification ??
      ResourceClassification.PUBLIC) as string
    const classLevel = CLASSIFICATION_HIERARCHY[classification] ?? 0

    // External messaging cannot target restricted or confidential resources.
    if (EXTERNAL_BLOCKING_ACTIONS.has(context.action.actionId)) {
      if (classLevel >= (CLASSIFICATION_HIERARCHY['CONFIDENTIAL'] ?? 0)) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.CLASSIFICATION_RESTRICTED,
          explanation: `Cannot send external messages about ${classification} resources`,
          severity: GuardrailSeverity.CRITICAL,
          metadata: { classification, action: context.action.actionId },
        }
      }
    }

    // RESTRICTED resources require additional scrutiny for modification.
    if (classification === 'RESTRICTED') {
      const readOnlyActions = ['READ_RESOURCE']
      if (!readOnlyActions.includes(context.action.actionId)) {
        return {
          guardrailId: this.id,
          guardrailName: this.name,
          passed: false,
          reasonCode: ActionReasonCode.CLASSIFICATION_RESTRICTED,
          explanation: 'Cannot modify RESTRICTED resources without explicit authorization',
          severity: GuardrailSeverity.HIGH,
          metadata: { classification, action: context.action.actionId },
        }
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: `Classification ${classification} is permitted for this action`,
      severity: GuardrailSeverity.INFO,
      metadata: { classification },
    }
  }
}
