/* Guardrail engine — composable evaluation pipeline that evaluates all guardrails and produces a deterministic decision.

Architecture:
  ActionContext → Guardrail[] → GuardrailResult[] → Conflict Resolution → ActionDecision

The engine is deterministic: the same inputs always produce the same decision.
No LLM calls, no arbitrary code execution, no side effects. */

import { Injectable, Logger } from '@nestjs/common'
import type {
  ActionContext,
  ActionDecision,
  ActionDecisionType,
  ActionReasonCode,
  GuardrailResult,
} from '@contextgraph/types'
import { ActionDecisionType as Decision, ActionReasonCode as Reason } from '@contextgraph/types'
import { IGuardrail, IGuardrailEngine } from '../domain/guardrails.interfaces'

@Injectable()
export class GuardrailEngine implements IGuardrailEngine {
  private readonly logger = new Logger(GuardrailEngine.name)
  private readonly guardrails: IGuardrail[] = []

  registerGuardrail(guardrail: IGuardrail): void {
    this.guardrails.push(guardrail)
    // Sort by priority (lower number = evaluated first).
    this.guardrails.sort((a, b) => a.priority - b.priority)
  }

  async evaluate(context: ActionContext): Promise<ActionDecision> {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    this.logger.debug(`Evaluating action: ${context.action.actionId} (trace: ${traceId})`)

    const results: GuardrailResult[] = []
    const passedGuardrails: string[] = []
    const violatedPolicies: string[] = []

    // Evaluate guardrails in priority order.
    // Short-circuit on CRITICAL failures (e.g., authentication failure).
    for (const guardrail of this.guardrails) {
      const result = await guardrail.evaluate(context)
      results.push(result)

      if (result.passed) {
        passedGuardrails.push(guardrail.id)
      } else {
        violatedPolicies.push(guardrail.id)
        // Short-circuit on critical failures — no point evaluating further.
        if (result.severity === 'CRITICAL') {
          this.logger.warn(`Critical guardrail failure: ${guardrail.id}`)
          break
        }
      }
    }

    // Resolve the final decision.
    const { decision, reasonCode, explanation } = resolveDecision(results, context)

    return {
      decision,
      allowed: decision === Decision.ALLOW,
      action: context.action.actionId,
      targetType: context.targetType,
      targetId: context.targetId,
      riskLevel: context.action.riskLevel,
      reasonCode,
      explanation,
      violatedPolicies,
      passedGuardrails,
      approvalRequired: decision === Decision.REQUIRES_APPROVAL,
      approvalReason: decision === Decision.REQUIRES_APPROVAL ? explanation : null,
      policyVersion: context.policyVersion,
      evaluatedAt: context.timestamp,
      traceId,
      publicTrace: results.filter((r) => r.severity !== 'CRITICAL'),
      fullTrace: results,
    }
  }
}

// ─── Decision Resolution ─────────────────────────────────────────────────────

function resolveDecision(
  results: readonly GuardrailResult[],
  _context: ActionContext,
): { decision: ActionDecisionType; reasonCode: ActionReasonCode | null; explanation: string } {
  const failed = results.filter((r) => !r.passed)

  // No failures → ALLOW.
  if (failed.length === 0) {
    return {
      decision: Decision.ALLOW,
      reasonCode: null,
      explanation: 'All guardrails passed',
    }
  }

  // Check for critical failures (authentication, org scope).
  const critical = failed.filter((r) => r.severity === 'CRITICAL')
  if (critical.length > 0) {
    return {
      decision: Decision.DENY,
      reasonCode: critical[0]!.reasonCode,
      explanation: critical[0]!.explanation,
    }
  }

  // Check for approval-required guardrails.
  const approvalNeeded = failed.filter((r) => r.reasonCode === Reason.APPROVAL_REQUIRED)
  if (approvalNeeded.length > 0) {
    return {
      decision: Decision.REQUIRES_APPROVAL,
      reasonCode: Reason.APPROVAL_REQUIRED,
      explanation: approvalNeeded[0]!.explanation,
    }
  }

  // Risk exceeded (CRITICAL risk level) → approval required.
  const riskExceeded = failed.filter((r) => r.reasonCode === Reason.RISK_EXCEEDED)
  if (riskExceeded.length > 0) {
    return {
      decision: Decision.REQUIRES_APPROVAL,
      reasonCode: Reason.RISK_EXCEEDED,
      explanation: riskExceeded[0]!.explanation,
    }
  }

  // All other failures → DENY.
  // Sort by severity (most severe first).
  const severityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    ERROR: 2,
    WARNING: 3,
    INFO: 4,
  }
  const sorted = [...failed].sort(
    (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99),
  )
  const top = sorted[0]!

  return {
    decision: Decision.DENY,
    reasonCode: top.reasonCode,
    explanation: top.explanation,
  }
}
