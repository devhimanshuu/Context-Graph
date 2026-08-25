/* Capability guardrail — verifies the principal has the capability required by the action.

Does not infer capabilities from action names — uses explicit action configuration. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class CapabilityGuardrail extends IGuardrail {
  readonly id = 'capability'
  readonly name = 'Capability'
  readonly priority = 20

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // In Phase 10, we use role-based capability mapping.
    // Future: resolve capabilities from service accounts / MCP session.
    const principalCapabilities = getRoleCapabilities(context.role)

    const requiredCapabilities = context.action.requiredCapabilities
    const missing = requiredCapabilities.filter((cap) => !principalCapabilities.includes(cap))

    if (missing.length > 0) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.CAPABILITY_MISSING,
        explanation: `Missing capabilities: ${missing.join(', ')}`,
        severity: GuardrailSeverity.HIGH,
        metadata: { required: requiredCapabilities, missing, available: principalCapabilities },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'All required capabilities present',
      severity: GuardrailSeverity.INFO,
      metadata: { capabilities: principalCapabilities },
    }
  }
}

/** Maps a role to its effective capabilities. Explicit — not inferred from name. */
function getRoleCapabilities(role: string): string[] {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return [
        'resource.read',
        'resource.create',
        'resource.update',
        'resource.delete',
        'knowledge.write',
        'knowledge.create',
        'knowledge.archive',
        'knowledge.publish',
        'communication.send_external',
        'approval.approve',
        'workflow.execute',
        'agent.execute',
      ]
    case 'MANAGER':
      return [
        'resource.read',
        'resource.create',
        'resource.update',
        'knowledge.write',
        'knowledge.create',
        'knowledge.archive',
        'knowledge.publish',
        'approval.approve',
        'workflow.execute',
        'agent.execute',
      ]
    case 'MEMBER':
      return [
        'resource.read',
        'resource.create',
        'resource.update',
        'knowledge.write',
        'knowledge.create',
        'workflow.execute',
        'agent.execute',
      ]
    case 'EDITOR':
      return [
        'resource.read',
        'resource.create',
        'resource.update',
        'knowledge.write',
        'knowledge.create',
        'workflow.execute',
      ]
    case 'HOD':
      return [
        'resource.read',
        'resource.create',
        'resource.update',
        'resource.delete',
        'knowledge.write',
        'knowledge.create',
        'knowledge.archive',
        'knowledge.publish',
        'approval.approve',
        'workflow.execute',
        'agent.execute',
      ]
    case 'QUALITY':
      return ['resource.read', 'knowledge.write', 'knowledge.publish', 'workflow.execute']
    case 'AUDITOR':
      return ['resource.read', 'workflow.execute']
    case 'VIEWER':
      return ['resource.read']
    default:
      return ['resource.read']
  }
}
