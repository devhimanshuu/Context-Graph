/* ContextGraph — Action Guardrail types (Phase 10: Agent Action Guardrails). */

import type { EntityId, Metadata, Timestamp } from "../primitives";

// ─── Action Types ────────────────────────────────────────────────────────────

export const ActionType = {
  READ_RESOURCE: "READ_RESOURCE",
  CREATE_RESOURCE: "CREATE_RESOURCE",
  UPDATE_RESOURCE: "UPDATE_RESOURCE",
  DELETE_RESOURCE: "DELETE_RESOURCE",
  UPDATE_KNOWLEDGE: "UPDATE_KNOWLEDGE",
  CREATE_KNOWLEDGE: "CREATE_KNOWLEDGE",
  ARCHIVE_KNOWLEDGE: "ARCHIVE_KNOWLEDGE",
  PUBLISH_KNOWLEDGE: "PUBLISH_KNOWLEDGE",
  SEND_EXTERNAL_MESSAGE: "SEND_EXTERNAL_MESSAGE",
  APPROVE_OPERATION: "APPROVE_OPERATION",
  EXECUTE_WORKFLOW: "EXECUTE_WORKFLOW",
  EXECUTE_TOOL: "EXECUTE_TOOL",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

// ─── Risk Levels ─────────────────────────────────────────────────────────────

export const GuardrailRiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type GuardrailRiskLevel =
  (typeof GuardrailRiskLevel)[keyof typeof GuardrailRiskLevel];

// ─── Action Decision ─────────────────────────────────────────────────────────

export const ActionDecisionType = {
  ALLOW: "ALLOW",
  DENY: "DENY",
  REQUIRES_APPROVAL: "REQUIRES_APPROVAL",
  ERROR: "ERROR",
} as const;
export type ActionDecisionType =
  (typeof ActionDecisionType)[keyof typeof ActionDecisionType];

// ─── Reason Codes ────────────────────────────────────────────────────────────

export const ActionReasonCode = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  CAPABILITY_MISSING: "CAPABILITY_MISSING",
  ORG_SCOPE_VIOLATION: "ORG_SCOPE_VIOLATION",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  INSUFFICIENT_PERMISSION: "INSUFFICIENT_PERMISSION",
  MISSING_CLEARANCE: "MISSING_CLEARANCE",
  CLASSIFICATION_RESTRICTED: "CLASSIFICATION_RESTRICTED",
  RESOURCE_STATE_INVALID: "RESOURCE_STATE_INVALID",
  POLICY_DENIED: "POLICY_DENIED",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  ACTION_NOT_REGISTERED: "ACTION_NOT_REGISTERED",
  TIME_RESTRICTION: "TIME_RESTRICTION",
  RISK_EXCEEDED: "RISK_EXCEEDED",
} as const;
export type ActionReasonCode =
  (typeof ActionReasonCode)[keyof typeof ActionReasonCode];

// ─── Guardrail Severity ──────────────────────────────────────────────────────

export const GuardrailSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  HIGH: "HIGH",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
} as const;
export type GuardrailSeverity =
  (typeof GuardrailSeverity)[keyof typeof GuardrailSeverity];

// ─── Resource Classification ─────────────────────────────────────────────────

export const ResourceClassification = {
  PUBLIC: "PUBLIC",
  INTERNAL: "INTERNAL",
  CONFIDENTIAL: "CONFIDENTIAL",
  RESTRICTED: "RESTRICTED",
} as const;
export type ResourceClassification =
  (typeof ResourceClassification)[keyof typeof ResourceClassification];

// ─── Evaluation Mode ─────────────────────────────────────────────────────────

export const EvaluationMode = {
  CURRENT: "CURRENT",
  HISTORICAL: "HISTORICAL",
} as const;
export type EvaluationMode =
  (typeof EvaluationMode)[keyof typeof EvaluationMode];

// ─── Approval Status ─────────────────────────────────────────────────────────

export const GuardrailApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type GuardrailApprovalStatus =
  (typeof GuardrailApprovalStatus)[keyof typeof GuardrailApprovalStatus];

// ─── Action Definition ───────────────────────────────────────────────────────

export interface ActionDefinition {
  readonly actionId: string;
  readonly name: string;
  readonly description: string;
  readonly riskLevel: GuardrailRiskLevel;
  readonly requiredCapabilities: readonly string[];
  readonly targetTypes: readonly string[];
  readonly policyRequirements: readonly string[];
  readonly approvalRequired: boolean;
  readonly approvalRiskLevels: readonly GuardrailRiskLevel[];
  readonly configuration: Metadata;
}

// ─── Action Check Request ────────────────────────────────────────────────────

export interface ActionCheckRequest {
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly parameters: Metadata;
  readonly purpose: string | null;
}

// ─── Action Context ──────────────────────────────────────────────────────────

export interface ActionContext {
  readonly principalId: EntityId;
  readonly organizationId: EntityId;
  readonly role: string;
  readonly permissionLevel: string;
  readonly complianceClearance: string;
  readonly action: ActionDefinition;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly parameters: Metadata;
  readonly purpose: string | null;
  readonly targetResource: TargetResourceContext | null;
  readonly evaluationMode: EvaluationMode;
  readonly policyVersion: string | null;
  readonly timestamp: Timestamp;
}

// ─── Target Resource Context ─────────────────────────────────────────────────

export interface TargetResourceContext {
  readonly resourceId: EntityId;
  readonly resourceType: string;
  readonly organizationId: EntityId;
  readonly ownerId: EntityId | null;
  readonly departmentId: EntityId | null;
  readonly classification: ResourceClassification;
  readonly state: string;
  readonly status: string;
  readonly metadata: Metadata;
}

// ─── Guardrail Result ────────────────────────────────────────────────────────

export interface GuardrailResult {
  readonly guardrailId: string;
  readonly guardrailName: string;
  readonly passed: boolean;
  readonly reasonCode: ActionReasonCode | null;
  readonly explanation: string;
  readonly severity: GuardrailSeverity;
  readonly metadata: Metadata;
}

// ─── Action Decision ─────────────────────────────────────────────────────────

export interface ActionDecision {
  readonly decision: ActionDecisionType;
  readonly allowed: boolean;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly riskLevel: GuardrailRiskLevel;
  readonly reasonCode: ActionReasonCode | null;
  readonly explanation: string;
  readonly violatedPolicies: readonly string[];
  readonly passedGuardrails: readonly string[];
  readonly approvalRequired: boolean;
  readonly approvalReason: string | null;
  readonly policyVersion: string | null;
  readonly evaluatedAt: Timestamp;
  readonly traceId: string;
  /** Public trace safe for agents. */
  readonly publicTrace: readonly GuardrailResult[];
  /** Full trace with internal details (admin only). */
  readonly fullTrace: readonly GuardrailResult[];
}

// ─── Constraint Definition ───────────────────────────────────────────────────

export const ConstraintOperator = {
  EQUALS: "EQUALS",
  NOT_EQUALS: "NOT_EQUALS",
  GREATER_THAN: "GREATER_THAN",
  LESS_THAN: "LESS_THAN",
  GREATER_THAN_OR_EQUAL: "GREATER_THAN_OR_EQUAL",
  LESS_THAN_OR_EQUAL: "LESS_THAN_OR_EQUAL",
  IN: "IN",
  NOT_IN: "NOT_IN",
  CONTAINS: "CONTAINS",
  MATCHES: "MATCHES",
} as const;
export type ConstraintOperator =
  (typeof ConstraintOperator)[keyof typeof ConstraintOperator];

export interface ConstraintCondition {
  readonly field: string;
  readonly operator: ConstraintOperator;
  readonly value: unknown;
}

export const ConstraintDecision = {
  ALLOW: "ALLOW",
  DENY: "DENY",
  REQUIRE_HUMAN_APPROVAL: "REQUIRE_HUMAN_APPROVAL",
} as const;
export type ConstraintDecision =
  (typeof ConstraintDecision)[keyof typeof ConstraintDecision];

export interface ConstraintDefinition {
  readonly constraintId: EntityId;
  readonly organizationId: EntityId;
  readonly action: string;
  readonly conditions: readonly ConstraintCondition[];
  readonly conditionLogic: "AND" | "OR";
  readonly decision: ConstraintDecision;
  readonly priority: number;
  readonly effectiveFrom: Timestamp;
  readonly effectiveUntil: Timestamp | null;
  readonly status: "ACTIVE" | "DISABLED" | "EXPIRED";
  readonly policyVersion: string | null;
  readonly description: string;
}

// ─── Action Audit Record ─────────────────────────────────────────────────────

export interface ActionAuditRecord {
  readonly recordId: EntityId;
  readonly principalId: EntityId;
  readonly organizationId: EntityId;
  readonly sessionId: string | null;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly decision: ActionDecisionType;
  readonly riskLevel: GuardrailRiskLevel;
  readonly reasonCode: ActionReasonCode | null;
  readonly policyVersion: string | null;
  readonly traceId: string;
  readonly latencyMs: number;
  readonly requestId: string;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

// ─── Guardrail Dashboard ─────────────────────────────────────────────────────

export interface GuardrailDashboardOverview {
  readonly totalChecks: number;
  readonly allowed: number;
  readonly denied: number;
  readonly approvalRequired: number;
  readonly topViolatedPolicies: readonly {
    readonly policy: string;
    readonly count: number;
  }[];
  readonly recentDecisions: readonly ActionAuditRecord[];
  readonly averageEvaluationTimeMs: number;
  readonly checksByRiskLevel: readonly {
    readonly riskLevel: string;
    readonly count: number;
  }[];
}
