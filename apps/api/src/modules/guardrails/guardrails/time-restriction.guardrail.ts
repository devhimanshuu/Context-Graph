/* Time-based guardrail — checks temporal restrictions on actions.

Validates that the current time falls within any time-based policy windows. */

import type { ActionContext, GuardrailResult } from '@contextgraph/types'
import { GuardrailSeverity } from '@contextgraph/types'
import { IGuardrail } from '../domain/guardrails.interfaces'

export class TimeRestrictionGuardrail extends IGuardrail {
  readonly id = 'time_restriction'
  readonly name = 'Time Restrictions'
  readonly priority = 130

  async evaluate(context: ActionContext): Promise<GuardrailResult> {
    // Check constraint effective dates (already loaded by policy constraint guardrail,
    // but this guardrail provides a clean time-based check as defense-in-depth).

    // For now, no time-based restrictions are configured at the guardrail level.
    // This guardrail is a placeholder for future time-window policies (e.g.,
    // "knowledge deletion only allowed during business hours").

    return {
      guardrailId: this.id,
      guardrailName: this.name,
      passed: true,
      reasonCode: null,
      explanation: 'No time restrictions apply',
      severity: GuardrailSeverity.INFO,
      metadata: { timestamp: context.timestamp },
    }
  }
}
