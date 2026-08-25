/* Budget guardrail — checks whether the action is within organizational budget limits. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IGuardrail, IBudgetChecker } from '../domain/guardrails.interfaces'
import { Inject } from '@nestjs/common'

/** Estimated cost per action type for budget checking. */
const ACTION_ESTIMATED_COSTS: Record<string, number> = {
  EXECUTE_WORKFLOW: 0.5,
  EXECUTE_TOOL: 0.1,
  SEND_EXTERNAL_MESSAGE: 0.05,
  CREATE_KNOWLEDGE: 0.01,
  UPDATE_KNOWLEDGE: 0.01,
  PUBLISH_KNOWLEDGE: 0.01,
}

export class BudgetGuardrail extends IGuardrail {
  readonly id = 'budget'
  readonly name = 'Budget / Cost'
  readonly priority = 140

  constructor(@Inject(IBudgetChecker) private readonly budgetChecker: IBudgetChecker) {
    super()
  }

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    const estimatedCost = ACTION_ESTIMATED_COSTS[context.action.actionId] ?? 0

    if (estimatedCost === 0) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: true,
        reasonCode: null,
        explanation: 'No cost associated with this action',
        severity: GuardrailSeverity.INFO,
        metadata: { estimatedCost: 0 },
      }
    }

    const result = await this.budgetChecker.checkBudget(
      context.organizationId,
      context.action.actionId,
      estimatedCost,
    )

    if (!result.withinBudget) {
      return {
        guardrailId: this.id,
        guardrailName: this.name,
        passed: false,
        reasonCode: ActionReasonCode.BUDGET_EXCEEDED,
        explanation: result.message,
        severity: GuardrailSeverity.HIGH,
        metadata: {
          currentUsage: result.currentUsage,
          limit: result.limit,
          estimatedCost,
        },
      }
    }

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'Within budget',
      severity: GuardrailSeverity.INFO,
      metadata: { currentUsage: result.currentUsage, limit: result.limit, estimatedCost },
    }
  }
}
