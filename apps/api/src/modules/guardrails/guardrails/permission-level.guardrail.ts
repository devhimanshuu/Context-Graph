/* Permission level guardrail — verifies the principal meets the minimum permission level required. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

const LEVEL_HIERARCHY: Record<string, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
}

const ACTION_REQUIRED_LEVELS: Record<string, string> = {
  READ_RESOURCE: 'READ',
  CREATE_RESOURCE: 'WRITE',
  UPDATE_RESOURCE: 'WRITE',
  DELETE_RESOURCE: 'ADMIN',
  UPDATE_KNOWLEDGE: 'WRITE',
  CREATE_KNOWLEDGE: 'WRITE',
  ARCHIVE_KNOWLEDGE: 'ADMIN',
  PUBLISH_KNOWLEDGE: 'ADMIN',
  SEND_EXTERNAL_MESSAGE: 'ADMIN',
  APPROVE_OPERATION: 'ADMIN',
  EXECUTE_WORKFLOW: 'WRITE',
  EXECUTE_TOOL: 'WRITE',
}

export class PermissionLevelGuardrail extends IGuardrail {
  readonly id = 'permission_level'
  readonly name = 'Permission Level'
  readonly priority = 60

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    const required = ACTION_REQUIRED_LEVELS[context.action.actionId] ?? 'READ'
    const principalLevel = LEVEL_HIERARCHY[context.permissionLevel] ?? 0
    const requiredLevel = LEVEL_HIERARCHY[required] ?? 0

    if (principalLevel < requiredLevel) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.INSUFFICIENT_PERMISSION,
        explanation: `Permission level ${context.permissionLevel} insufficient — requires ${required}`,
        severity: GuardrailSeverity.HIGH,
        metadata: {
          principalLevel: context.permissionLevel,
          requiredLevel: required,
        },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: `Permission level ${context.permissionLevel} meets requirement ${required}`,
      severity: GuardrailSeverity.INFO,
      metadata: { principalLevel: context.permissionLevel, requiredLevel: required },
    }
  }
}
