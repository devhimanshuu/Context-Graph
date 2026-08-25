/* ContextGraph — Governance domain types (Phase 17: Enterprise Control Plane). */

import type { EntityId, Metadata, Timestamp } from "../primitives";

// ---------------------------------------------------------------------------
// Organization Settings
// ---------------------------------------------------------------------------

export interface OrganizationSettings {
  /** Default LLM model for all agent/workflow executions. */
  readonly defaultModel: string | null;
  /** Allowed model provider identifiers (empty = all allowed). */
  readonly allowedModelProviders: readonly string[];
  /** External LLM policy. */
  readonly externalLlmPolicy: ExternalLlmPolicy;
  /** Maximum context window size in tokens. */
  readonly maxContextSize: number;
  /** Maximum single agent execution duration (ms). */
  readonly maxAgentExecutionDurationMs: number;
  /** Maximum single workflow cost in USD. */
  readonly maxWorkflowCost: number;
  /** Document upload limit per organization (bytes). */
  readonly documentUploadLimitBytes: number;
  /** Data retention period in days (null = indefinite). */
  readonly retentionDays: number | null;
  /** Security settings. */
  readonly security: OrganizationSecuritySettings;
  /** Feature flags. */
  readonly features: Record<string, boolean>;
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  defaultModel: null,
  allowedModelProviders: [],
  externalLlmPolicy: "EXTERNAL_LLM_ALLOWED",
  maxContextSize: 128_000,
  maxAgentExecutionDurationMs: 300_000,
  maxWorkflowCost: 10.0,
  documentUploadLimitBytes: 100 * 1024 * 1024,
  retentionDays: 365,
  security: {
    requireMfa: false,
    sessionTimeoutMinutes: 60,
    ipAllowlist: [],
    breakGlassEnabled: false,
  },
  features: {},
};

export const ExternalLlmPolicy = {
  EXTERNAL_LLM_ALLOWED: "EXTERNAL_LLM_ALLOWED",
  EXTERNAL_LLM_BLOCKED: "EXTERNAL_LLM_BLOCKED",
  LOCAL_MODEL_ONLY: "LOCAL_MODEL_ONLY",
} as const;
export type ExternalLlmPolicy =
  (typeof ExternalLlmPolicy)[keyof typeof ExternalLlmPolicy];

export interface OrganizationSecuritySettings {
  readonly requireMfa: boolean;
  readonly sessionTimeoutMinutes: number;
  readonly ipAllowlist: readonly string[];
  readonly breakGlassEnabled: boolean;
}

// ---------------------------------------------------------------------------
// User Membership (multi-org support)
// ---------------------------------------------------------------------------

export const MembershipStatus = {
  INVITED: "INVITED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REMOVED: "REMOVED",
} as const;
export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

export interface UserMembership {
  readonly membershipId: EntityId;
  readonly userId: EntityId;
  readonly organizationId: EntityId;
  readonly role: string;
  readonly status: MembershipStatus;
  readonly joinedAt: Timestamp;
  readonly invitedBy: EntityId | null;
  readonly metadata: Metadata;
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export const TeamStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type TeamStatus = (typeof TeamStatus)[keyof typeof TeamStatus];

export interface Team {
  readonly teamId: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly status: TeamStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface TeamMembership {
  readonly membershipId: EntityId;
  readonly teamId: EntityId;
  readonly userId: EntityId;
  readonly role: string;
  readonly joinedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Custom Roles
// ---------------------------------------------------------------------------

export const BuiltInRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
} as const;
export type BuiltInRole = (typeof BuiltInRole)[keyof typeof BuiltInRole];

export const RoleStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type RoleStatus = (typeof RoleStatus)[keyof typeof RoleStatus];

export interface CustomRole {
  readonly roleId: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly isBuiltIn: boolean;
  readonly status: RoleStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Permissions (granular, string-based)
// ---------------------------------------------------------------------------

export const PermissionResource = {
  ORGANIZATION: "organization",
  USER: "user",
  TEAM: "team",
  ROLE: "role",
  KNOWLEDGE: "knowledge",
  DOCUMENT: "document",
  GRAPH: "graph",
  AGENT: "agent",
  WORKFLOW: "workflow",
  MODEL: "model",
  POLICY: "policy",
  AUDIT: "audit",
  USAGE: "usage",
  BILLING: "billing",
  SETTINGS: "settings",
} as const;
export type PermissionResource =
  (typeof PermissionResource)[keyof typeof PermissionResource];

export const PermissionActionType = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
  EXECUTE: "execute",
  INVITE: "invite",
  SUSPEND: "suspend",
  PUBLISH: "publish",
  APPROVE: "approve",
} as const;
export type PermissionActionType =
  (typeof PermissionActionType)[keyof typeof PermissionActionType];

/** All known permission strings. Format: "resource.action" */
export const ALL_PERMISSIONS = [
  "organization.read",
  "organization.update",
  "user.read",
  "user.invite",
  "user.suspend",
  "user.remove",
  "team.manage",
  "team.read",
  "role.manage",
  "role.read",
  "knowledge.read",
  "knowledge.create",
  "knowledge.update",
  "knowledge.delete",
  "document.upload",
  "document.archive",
  "document.read",
  "graph.read",
  "agent.execute",
  "agent.manage",
  "agent.read",
  "workflow.execute",
  "workflow.manage",
  "workflow.read",
  "model.use",
  "model.manage",
  "model.read",
  "policy.read",
  "policy.manage",
  "audit.read",
  "usage.read",
  "billing.read",
  "settings.read",
  "settings.update",
] as const;
export type PermissionString = (typeof ALL_PERMISSIONS)[number];

/** Default permissions per built-in role. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  OWNER: ["*"],
  ADMIN: [
    "organization.read",
    "organization.update",
    "user.read",
    "user.invite",
    "user.suspend",
    "user.remove",
    "team.manage",
    "team.read",
    "role.manage",
    "role.read",
    "knowledge.read",
    "knowledge.create",
    "knowledge.update",
    "knowledge.delete",
    "document.upload",
    "document.archive",
    "document.read",
    "graph.read",
    "agent.execute",
    "agent.manage",
    "agent.read",
    "workflow.execute",
    "workflow.manage",
    "workflow.read",
    "model.use",
    "model.manage",
    "model.read",
    "policy.read",
    "policy.manage",
    "audit.read",
    "usage.read",
    "billing.read",
    "settings.read",
    "settings.update",
  ],
  MANAGER: [
    "organization.read",
    "user.read",
    "user.invite",
    "team.manage",
    "team.read",
    "role.read",
    "knowledge.read",
    "knowledge.create",
    "knowledge.update",
    "document.upload",
    "document.read",
    "graph.read",
    "agent.execute",
    "agent.read",
    "workflow.execute",
    "workflow.manage",
    "workflow.read",
    "model.use",
    "model.read",
    "policy.read",
    "audit.read",
    "usage.read",
    "settings.read",
  ],
  MEMBER: [
    "organization.read",
    "user.read",
    "team.read",
    "knowledge.read",
    "knowledge.create",
    "document.upload",
    "document.read",
    "graph.read",
    "agent.execute",
    "agent.read",
    "workflow.execute",
    "workflow.read",
    "model.use",
    "model.read",
    "audit.read",
    "usage.read",
    "settings.read",
  ],
  VIEWER: [
    "organization.read",
    "user.read",
    "team.read",
    "knowledge.read",
    "document.read",
    "graph.read",
    "agent.read",
    "workflow.read",
    "model.read",
    "audit.read",
    "usage.read",
    "settings.read",
  ],
};

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export const PolicyType = {
  ACCESS: "ACCESS",
  KNOWLEDGE: "KNOWLEDGE",
  AGENT: "AGENT",
  WORKFLOW: "WORKFLOW",
  MODEL: "MODEL",
  DATA_RETENTION: "DATA_RETENTION",
  COST: "COST",
  SECURITY: "SECURITY",
} as const;
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];

export const PolicyStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type PolicyStatus = (typeof PolicyStatus)[keyof typeof PolicyStatus];

export interface Policy {
  readonly policyId: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly type: PolicyType;
  readonly version: number;
  readonly status: PolicyStatus;
  readonly configuration: Metadata;
  readonly createdBy: EntityId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Agent Governance
// ---------------------------------------------------------------------------

export const AgentDefinitionStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type AgentDefinitionStatus =
  (typeof AgentDefinitionStatus)[keyof typeof AgentDefinitionStatus];

export interface AgentDefinition {
  readonly agentId: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly status: AgentDefinitionStatus;
  readonly capabilities: readonly string[];
  readonly allowedTools: readonly string[];
  readonly modelProvider: string | null;
  readonly modelName: string | null;
  readonly maxIterations: number;
  readonly maxToolCalls: number;
  readonly maxTokens: number;
  readonly maxCost: number;
  readonly maxExecutionDurationMs: number;
  readonly policyReferences: readonly EntityId[];
  readonly createdBy: EntityId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Model Governance
// ---------------------------------------------------------------------------

export const ModelProviderStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;
export type ModelProviderStatus =
  (typeof ModelProviderStatus)[keyof typeof ModelProviderStatus];

export interface ModelProviderConfiguration {
  readonly configId: EntityId;
  readonly organizationId: EntityId;
  readonly provider: string;
  readonly status: ModelProviderStatus;
  readonly allowedModels: readonly string[];
  readonly blockedModels: readonly string[];
  readonly defaultModel: string | null;
  readonly fallbackModel: string | null;
  readonly maxTokensPerRequest: number;
  readonly costPerInputToken: number;
  readonly costPerOutputToken: number;
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export const DataClassification = {
  PUBLIC: "PUBLIC",
  INTERNAL: "INTERNAL",
  CONFIDENTIAL: "CONFIDENTIAL",
  RESTRICTED: "RESTRICTED",
} as const;
export type DataClassification =
  (typeof DataClassification)[keyof typeof DataClassification];

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export const BudgetType = {
  ORGANIZATION: "ORGANIZATION",
  USER: "USER",
  AGENT: "AGENT",
  WORKFLOW: "WORKFLOW",
  MODEL: "MODEL",
} as const;
export type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];

export const BudgetPeriod = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  CUSTOM: "CUSTOM",
} as const;
export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];

export const BudgetStatus = {
  NORMAL: "NORMAL",
  WARNING: "WARNING",
  LIMIT_REACHED: "LIMIT_REACHED",
  BLOCKED: "BLOCKED",
} as const;
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];

export interface Budget {
  readonly budgetId: EntityId;
  readonly organizationId: EntityId;
  readonly type: BudgetType;
  readonly targetType: string | null;
  readonly targetId: EntityId | null;
  readonly limit: number;
  readonly period: BudgetPeriod;
  readonly currentUsage: number;
  readonly status: BudgetStatus;
  readonly warningThreshold: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Usage Tracking
// ---------------------------------------------------------------------------

export interface UsageRecord {
  readonly usageId: EntityId;
  readonly organizationId: EntityId;
  readonly userId: EntityId;
  readonly agentId: EntityId | null;
  readonly workflowId: EntityId | null;
  readonly modelProvider: string;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly toolCalls: number;
  readonly retrievalCalls: number;
  readonly embeddingsCount: number;
  readonly storageBytes: number;
  readonly durationMs: number;
  readonly estimatedCost: number;
  readonly timestamp: Timestamp;
}

// ---------------------------------------------------------------------------
// Governance Audit Events (immutable, append-only)
// ---------------------------------------------------------------------------

export const AuditEventType = {
  USER_INVITED: "USER_INVITED",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_REACTIVATED: "USER_REACTIVATED",
  USER_REMOVED: "USER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  PERMISSION_CHANGED: "PERMISSION_CHANGED",
  POLICY_CREATED: "POLICY_CREATED",
  POLICY_UPDATED: "POLICY_UPDATED",
  POLICY_PUBLISHED: "POLICY_PUBLISHED",
  POLICY_DISABLED: "POLICY_DISABLED",
  AGENT_CREATED: "AGENT_CREATED",
  AGENT_ENABLED: "AGENT_ENABLED",
  AGENT_DISABLED: "AGENT_DISABLED",
  WORKFLOW_PUBLISHED: "WORKFLOW_PUBLISHED",
  WORKFLOW_EXECUTED: "WORKFLOW_EXECUTED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  DOCUMENT_ARCHIVED: "DOCUMENT_ARCHIVED",
  MODEL_CONFIG_CHANGED: "MODEL_CONFIG_CHANGED",
  BUDGET_CREATED: "BUDGET_CREATED",
  BUDGET_CHANGED: "BUDGET_CHANGED",
  SECURITY_POLICY_CHANGED: "SECURITY_POLICY_CHANGED",
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED",
  APPROVAL_RESOLVED: "APPROVAL_RESOLVED",
  BREAK_GLASS_USED: "BREAK_GLASS_USED",
  AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  COST_LIMIT_EXCEEDED: "COST_LIMIT_EXCEEDED",
  ORG_SETTINGS_CHANGED: "ORG_SETTINGS_CHANGED",
  TEAM_CREATED: "TEAM_CREATED",
  TEAM_DELETED: "TEAM_DELETED",
} as const;
export type AuditEventType =
  (typeof AuditEventType)[keyof typeof AuditEventType];

export const AuditOutcome = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  DENIED: "DENIED",
} as const;
export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

export interface GovernanceAuditEvent {
  readonly eventId: EntityId;
  readonly organizationId: EntityId;
  readonly actorId: EntityId;
  readonly actorType: string;
  readonly eventType: AuditEventType;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: EntityId | null;
  readonly outcome: AuditOutcome;
  readonly timestamp: Timestamp;
  readonly requestId: string | null;
  readonly metadata: Metadata;
  /** Hash of this event for tamper-evident chain. */
  readonly hash: string;
  /** Hash of the previous event in this organization's chain. */
  readonly previousHash: string | null;
}

// ---------------------------------------------------------------------------
// Break-Glass Access
// ---------------------------------------------------------------------------

export const BreakGlassStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;
export type BreakGlassStatus =
  (typeof BreakGlassStatus)[keyof typeof BreakGlassStatus];

export interface BreakGlassAccess {
  readonly accessId: EntityId;
  readonly organizationId: EntityId;
  readonly userId: EntityId;
  readonly permissions: readonly string[];
  readonly reason: string;
  readonly grantedBy: EntityId;
  readonly status: BreakGlassStatus;
  readonly expiresAt: Timestamp;
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Policy Simulation
// ---------------------------------------------------------------------------

export interface PolicySimulationRequest {
  readonly userId: EntityId;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly action: string;
  readonly policyIds: readonly EntityId[];
  readonly contextOverrides?: Metadata;
}

export interface PolicySimulationResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly matchedPolicies: readonly string[];
  readonly deniedPolicies: readonly string[];
  readonly evaluatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Governance Analytics
// ---------------------------------------------------------------------------

export interface GovernanceOverview {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly activeAgents: number;
  readonly activeWorkflows: number;
  readonly activePolicies: number;
  readonly securityEvents: number;
  readonly monthlyCost: number;
  readonly budgetUsage: number;
  readonly failedExecutions: number;
  readonly authorizationDenials: number;
}
