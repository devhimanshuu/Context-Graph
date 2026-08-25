/* Guardrails domain interfaces — DI tokens and abstract contracts for the action guardrail engine. */

import type {
  ActionContext,
  ActionDecision,
  ActionDefinition,
  ActionAuditRecord,
  ActionDecisionType,
  ConstraintDefinition,
  GuardrailDashboardOverview,
  GuardrailResult,
  TargetResourceContext,
} from '@contextgraph/types'

// ─── Action Registry ─────────────────────────────────────────────────────────

/** Central registry of all known actions with their risk levels and policies. */
export abstract class IActionRegistry {
  abstract register(definition: ActionDefinition): void
  abstract get(actionId: string): ActionDefinition | undefined
  abstract getAll(): readonly ActionDefinition[]
  abstract getByTargetType(targetType: string): readonly ActionDefinition[]
}

// ─── Guardrail Interface ─────────────────────────────────────────────────────

/** A single composable guardrail that evaluates one aspect of an action. */
export abstract class IGuardrail {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly priority: number
  abstract evaluate(context: ActionContext): Promise<GuardrailResult>
}

// ─── Guardrail Engine ────────────────────────────────────────────────────────

/** Composable engine that evaluates all guardrails and produces a decision. */
export abstract class IGuardrailEngine {
  abstract evaluate(context: ActionContext): Promise<ActionDecision>
}

// ─── Constraint Engine ───────────────────────────────────────────────────────

/** Evaluates declarative policy constraints against an action context. */
export abstract class IConstraintEngine {
  abstract evaluate(
    context: ActionContext,
    constraints: readonly ConstraintDefinition[],
  ): Promise<GuardrailResult[]>
  abstract evaluateConflictResolution(results: readonly GuardrailResult[]): {
    decision: ActionDecisionType
    reasonCode: string | null
    reason: string
  }
}

// ─── Constraint Repository ───────────────────────────────────────────────────

export abstract class IConstraintRepository {
  abstract findActiveByOrganization(
    organizationId: string,
    action?: string,
  ): Promise<readonly ConstraintDefinition[]>
  abstract findByOrganizationAndAction(
    organizationId: string,
    action: string,
  ): Promise<readonly ConstraintDefinition[]>
}

// ─── Action Audit Logger ─────────────────────────────────────────────────────

/** Immutable audit trail for action check decisions. */
export abstract class IActionAuditLogger {
  abstract recordDecision(record: ActionAuditRecord): Promise<void>
  abstract findByOrganization(
    organizationId: string,
    filters?: {
      action?: string
      decision?: ActionDecisionType
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ): Promise<readonly ActionAuditRecord[]>
  abstract getOverview(organizationId: string): Promise<GuardrailDashboardOverview>
}

// ─── Resource Resolver ───────────────────────────────────────────────────────

/** Resolves target resource attributes for guardrail evaluation. */
export abstract class IResourceResolver {
  abstract resolve(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<TargetResourceContext | null>
}

// ─── Budget Checker ──────────────────────────────────────────────────────────

/** Checks whether an action is within organizational budget limits. */
export abstract class IBudgetChecker {
  abstract checkBudget(
    organizationId: string,
    action: string,
    estimatedCost: number,
  ): Promise<{ withinBudget: boolean; currentUsage: number; limit: number; message: string }>
}
