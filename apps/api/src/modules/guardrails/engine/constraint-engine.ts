/* Constraint engine — evaluates declarative policy constraints and resolves conflicts.

Conflict resolution strategy:
  1. DENY overrides ALLOW
  2. REQUIRE_HUMAN_APPROVAL overrides automatic ALLOW
  3. Priority ordering determines precedence for same-decision constraints
  4. Most restrictive wins when priorities are equal

Never executes arbitrary code — only evaluates validated declarative conditions. */

import { Injectable } from '@nestjs/common'
import type {
  ActionContext,
  ActionDecisionType,
  ConstraintCondition,
  ConstraintDefinition,
  ConstraintOperator,
  GuardrailResult,
} from '@contextgraph/types'
import { ConstraintDecision } from '@contextgraph/types'
import { GuardrailSeverity, ActionReasonCode } from '@contextgraph/types'
import { IConstraintEngine } from '../domain/guardrails.interfaces'

@Injectable()
export class ConstraintEngine implements IConstraintEngine {
  async evaluate(
    context: ActionContext,
    constraints: readonly ConstraintDefinition[],
  ): Promise<GuardrailResult[]> {
    const results: GuardrailResult[] = []
    const now = new Date(context.timestamp)

    for (const constraint of constraints) {
      // Skip expired or disabled constraints.
      if (constraint.status !== 'ACTIVE') {
        results.push({
          guardrailId: `constraint:${constraint.constraintId}`,
          guardrailName: `Constraint: ${constraint.description}`,
          passed: true,
          reasonCode: null,
          explanation: `Constraint is ${constraint.status.toLowerCase()}`,
          severity: GuardrailSeverity.INFO,
          metadata: { constraintId: constraint.constraintId, status: constraint.status },
        })
        continue
      }

      // Check effective date range.
      const effectiveFrom = new Date(constraint.effectiveFrom)
      if (now < effectiveFrom) {
        results.push({
          guardrailId: `constraint:${constraint.constraintId}`,
          guardrailName: `Constraint: ${constraint.description}`,
          passed: true,
          reasonCode: null,
          explanation: 'Constraint not yet effective',
          severity: GuardrailSeverity.INFO,
          metadata: { constraintId: constraint.constraintId },
        })
        continue
      }

      if (constraint.effectiveUntil !== null) {
        const effectiveUntil = new Date(constraint.effectiveUntil)
        if (now > effectiveUntil) {
          results.push({
            guardrailId: `constraint:${constraint.constraintId}`,
            guardrailName: `Constraint: ${constraint.description}`,
            passed: true,
            reasonCode: null,
            explanation: 'Constraint has expired',
            severity: GuardrailSeverity.INFO,
            metadata: { constraintId: constraint.constraintId },
          })
          continue
        }
      }

      // Evaluate conditions.
      const conditionsMet = evaluateConditions(
        constraint.conditions,
        constraint.conditionLogic,
        context,
      )

      if (conditionsMet) {
        const passed = constraint.decision === ConstraintDecision.ALLOW
        results.push({
          guardrailId: `constraint:${constraint.constraintId}`,
          guardrailName: `Constraint: ${constraint.description}`,
          passed,
          reasonCode:
            constraint.decision === ConstraintDecision.DENY
              ? ActionReasonCode.POLICY_DENIED
              : constraint.decision === ConstraintDecision.REQUIRE_HUMAN_APPROVAL
                ? ActionReasonCode.APPROVAL_REQUIRED
                : null,
          explanation: constraint.description,
          severity:
            constraint.decision === ConstraintDecision.DENY
              ? GuardrailSeverity.HIGH
              : GuardrailSeverity.HIGH,
          metadata: {
            constraintId: constraint.constraintId,
            decision: constraint.decision,
            priority: constraint.priority,
          },
        })
      } else {
        results.push({
          guardrailId: `constraint:${constraint.constraintId}`,
          guardrailName: `Constraint: ${constraint.description}`,
          passed: true,
          reasonCode: null,
          explanation: 'Constraint conditions not met',
          severity: GuardrailSeverity.INFO,
          metadata: { constraintId: constraint.constraintId },
        })
      }
    }

    return results
  }

  evaluateConflictResolution(results: readonly GuardrailResult[]): {
    decision: ActionDecisionType
    reasonCode: string | null
    reason: string
  } {
    const failed = results.filter((r) => !r.passed)

    if (failed.length === 0) {
      return { decision: 'ALLOW', reasonCode: null, reason: 'All constraints satisfied' }
    }

    // Priority order: DENY > REQUIRE_HUMAN_APPROVAL
    const denyResults = failed.filter((r) => r.reasonCode === ActionReasonCode.POLICY_DENIED)
    const approvalResults = failed.filter(
      (r) => r.reasonCode === ActionReasonCode.APPROVAL_REQUIRED,
    )

    if (denyResults.length > 0) {
      // Sort by priority (highest = most restrictive).
      const sorted = [...denyResults].sort((a, b) => {
        const aPriority = (a.metadata.priority as number) ?? 0
        const bPriority = (b.metadata.priority as number) ?? 0
        return bPriority - aPriority
      })
      const top = sorted[0]!
      return {
        decision: 'DENY',
        reasonCode: top.reasonCode,
        reason: top.explanation,
      }
    }

    if (approvalResults.length > 0) {
      const sorted = [...approvalResults].sort((a, b) => {
        const aPriority = (a.metadata.priority as number) ?? 0
        const bPriority = (b.metadata.priority as number) ?? 0
        return bPriority - aPriority
      })
      const top = sorted[0]!
      return {
        decision: 'REQUIRES_APPROVAL',
        reasonCode: top.reasonCode,
        reason: top.explanation,
      }
    }

    // Fallback — should never happen since failed.length > 0.
    return { decision: 'DENY', reasonCode: 'POLICY_DENIED', reason: 'Unknown policy violation' }
  }
}

// ─── Condition Evaluation ────────────────────────────────────────────────────

function evaluateConditions(
  conditions: readonly ConstraintCondition[],
  logic: 'AND' | 'OR',
  context: ActionContext,
): boolean {
  if (conditions.length === 0) return false

  const results = conditions.map((condition) => evaluateCondition(condition, context))

  if (logic === 'AND') {
    return results.every((r) => r)
  }
  // OR logic
  return results.some((r) => r)
}

function evaluateCondition(condition: ConstraintCondition, context: ActionContext): boolean {
  const fieldValue = resolveField(condition.field, context)
  return compareValues(fieldValue, condition.operator, condition.value)
}

/** Resolves a field name to its value from the action context. Supports dotted paths. */
function resolveField(field: string, context: ActionContext): unknown {
  const parts = field.split('.')
  let current: unknown = context

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/** Deterministic value comparison — no code execution. */
function compareValues(
  fieldValue: unknown,
  operator: ConstraintOperator,
  constraintValue: unknown,
): boolean {
  switch (operator) {
    case 'EQUALS':
      return fieldValue === constraintValue
    case 'NOT_EQUALS':
      return fieldValue !== constraintValue
    case 'GREATER_THAN':
      return (
        typeof fieldValue === 'number' &&
        typeof constraintValue === 'number' &&
        fieldValue > constraintValue
      )
    case 'LESS_THAN':
      return (
        typeof fieldValue === 'number' &&
        typeof constraintValue === 'number' &&
        fieldValue < constraintValue
      )
    case 'GREATER_THAN_OR_EQUAL':
      return (
        typeof fieldValue === 'number' &&
        typeof constraintValue === 'number' &&
        fieldValue >= constraintValue
      )
    case 'LESS_THAN_OR_EQUAL':
      return (
        typeof fieldValue === 'number' &&
        typeof constraintValue === 'number' &&
        fieldValue <= constraintValue
      )
    case 'IN':
      return Array.isArray(constraintValue) && constraintValue.includes(fieldValue)
    case 'NOT_IN':
      return Array.isArray(constraintValue) && !constraintValue.includes(fieldValue)
    case 'CONTAINS':
      return (
        typeof fieldValue === 'string' &&
        typeof constraintValue === 'string' &&
        fieldValue.includes(constraintValue)
      )
    case 'MATCHES':
      return (
        typeof fieldValue === 'string' &&
        typeof constraintValue === 'string' &&
        new RegExp(constraintValue).test(fieldValue)
      )
    default:
      return false
  }
}
