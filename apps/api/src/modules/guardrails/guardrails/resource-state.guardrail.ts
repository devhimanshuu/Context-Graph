/* Resource state guardrail — checks whether the target resource is in a valid state for the action. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

/** Resource states that block modification. */
const NON_MODIFIABLE_STATES = new Set(['ARCHIVED', 'DELETED', 'LEGAL_HOLD'])
/** Resource states that block deletion. */
const NON_DELETABLE_STATES = new Set(['LEGAL_HOLD'])
/** Resource states that block publishing. */
const NON_PUBLISHABLE_STATES = new Set(['SUPERSEDED', 'EXPIRED', 'ARCHIVED', 'DELETED'])

export class ResourceStateGuardrail extends IGuardrail {
  readonly id = 'resource_state'
  readonly name = 'Resource State'
  readonly priority = 90

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    if (context.targetResource === null) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No target resource to check',
        severity: GuardrailSeverity.INFO,
        metadata: {},
      }
    }

    const state = context.targetResource.state
    const status = context.targetResource.status
    const effectiveState = state || status

    if (!effectiveState || effectiveState === 'ACTIVE' || effectiveState === 'DRAFT') {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: `Resource state ${effectiveState ?? 'active'} allows this action`,
        severity: GuardrailSeverity.INFO,
        metadata: { state: effectiveState },
      }
    }

    // Check delete actions against non-deletable states.
    if (context.action.actionId === 'DELETE_RESOURCE' && NON_DELETABLE_STATES.has(effectiveState)) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.RESOURCE_STATE_INVALID,
        explanation: `Cannot delete resource in ${effectiveState} state`,
        severity: GuardrailSeverity.HIGH,
        metadata: { state: effectiveState, action: context.action.actionId },
      }
    }

    // Check publish actions against non-publishable states.
    if (
      context.action.actionId === 'PUBLISH_KNOWLEDGE' &&
      NON_PUBLISHABLE_STATES.has(effectiveState)
    ) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.RESOURCE_STATE_INVALID,
        explanation: `Cannot publish resource in ${effectiveState} state`,
        severity: GuardrailSeverity.HIGH,
        metadata: { state: effectiveState, action: context.action.actionId },
      }
    }

    // Check modification actions against non-modifiable states.
    const modifyingActions = ['UPDATE_RESOURCE', 'UPDATE_KNOWLEDGE', 'ARCHIVE_KNOWLEDGE']
    if (
      modifyingActions.includes(context.action.actionId) &&
      NON_MODIFIABLE_STATES.has(effectiveState)
    ) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.RESOURCE_STATE_INVALID,
        explanation: `Cannot modify resource in ${effectiveState} state`,
        severity: GuardrailSeverity.HIGH,
        metadata: { state: effectiveState, action: context.action.actionId },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: `Resource state ${effectiveState} permits this action`,
      severity: GuardrailSeverity.INFO,
      metadata: { state: effectiveState },
    }
  }
}
