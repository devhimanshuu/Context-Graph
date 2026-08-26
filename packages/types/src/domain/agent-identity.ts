/* Agent Identity types — shared contracts for the agent identity system (Phase 14). */

import type { EntityId, Timestamp } from "../primitives";

// ─── Agent Identity ──────────────────────────────────────────────────────

export const AgentIdentityStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
  ARCHIVED: "ARCHIVED",
} as const;
export type AgentIdentityStatus =
  (typeof AgentIdentityStatus)[keyof typeof AgentIdentityStatus];

export const AgentEnvironment = {
  DEVELOPMENT: "DEVELOPMENT",
  STAGING: "STAGING",
  PRODUCTION: "PRODUCTION",
} as const;
export type AgentEnvironment =
  (typeof AgentEnvironment)[keyof typeof AgentEnvironment];

export interface AgentIdentity {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly purpose: string | null;
  readonly environment: AgentEnvironment;
  readonly status: AgentIdentityStatus;
  readonly ownerUserId: EntityId | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly lastUsedAt: Timestamp | null;
}

// ─── Agent Credential ────────────────────────────────────────────────────

export const CredentialType = {
  API_KEY: "API_KEY",
} as const;
export type CredentialType =
  (typeof CredentialType)[keyof typeof CredentialType];

export const CredentialStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type CredentialStatus =
  (typeof CredentialStatus)[keyof typeof CredentialStatus];

export interface AgentCredential {
  readonly id: EntityId;
  readonly agentIdentityId: EntityId;
  readonly name: string;
  readonly type: CredentialType;
  readonly status: CredentialStatus;
  readonly keyPrefix: string;
  readonly keyHash: string;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp | null;
  readonly lastUsedAt: Timestamp | null;
  readonly revokedAt: Timestamp | null;
}

/** The one-time reveal of a newly created API key. Never stored or retrievable again. */
export interface CreatedCredential {
  readonly credential: AgentCredential;
  readonly secret: string;
  readonly fullKey: string;
}

// ─── Agent Capability ────────────────────────────────────────────────────

export const IdentityCapability = {
  CONTEXT_RESOLVE: "context.resolve",
  GRAPH_READ: "graph.read",
  PIPELINE_READ: "pipeline.read",
  PIPELINE_REPLAY: "pipeline.replay",
  KNOWLEDGE_PROPOSE: "knowledge.propose",
  KNOWLEDGE_READ: "knowledge.read",
  ACTION_CHECK: "action.check",
  EVENTS_SUBSCRIBE: "events.subscribe",
} as const;
export type IdentityCapability =
  (typeof IdentityCapability)[keyof typeof IdentityCapability];

export interface AgentIdentityCapability {
  readonly id: EntityId;
  readonly agentIdentityId: EntityId;
  readonly capability: IdentityCapability;
  readonly grantedBy: EntityId | null;
  readonly grantedAt: Timestamp;
  readonly expiresAt: Timestamp | null;
}

// ─── Agent Session ───────────────────────────────────────────────────────

export const AgentSessionStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;
export type AgentSessionStatus =
  (typeof AgentSessionStatus)[keyof typeof AgentSessionStatus];

export interface AgentSession {
  readonly sessionId: string;
  readonly agentIdentityId: EntityId;
  readonly credentialId: EntityId;
  readonly organizationId: EntityId;
  readonly environment: AgentEnvironment;
  readonly capabilities: readonly IdentityCapability[];
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly lastActivityAt: Timestamp;
  readonly status: AgentSessionStatus;
}

// ─── Agent Authentication Context ────────────────────────────────────────

export interface AgentAuthenticationContext {
  readonly principalType: "AGENT";
  readonly agentIdentityId: EntityId;
  readonly credentialId: EntityId;
  readonly organizationId: EntityId;
  readonly environment: AgentEnvironment;
  readonly capabilities: readonly IdentityCapability[];
  readonly sessionId: string;
  readonly authenticatedAt: Timestamp;
}

// ─── Agent Policy ────────────────────────────────────────────────────────

export interface AgentPolicyConfig {
  readonly maxContextSize: number;
  readonly maxNodes: number;
  readonly maxToolCallsPerMinute: number;
  readonly maxActionRisk: string;
  readonly maxProposalsPerHour: number;
  readonly maxCostPerDay: number;
  readonly maxExecutionDurationMs: number;
  readonly allowedEnvironments: readonly AgentEnvironment[];
}

// ─── Create / Update Inputs ──────────────────────────────────────────────

export interface CreateAgentIdentityInput {
  readonly organizationId: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly purpose?: string;
  readonly environment: AgentEnvironment;
  readonly ownerUserId?: EntityId | null;
}

export interface UpdateAgentIdentityInput {
  readonly name?: string;
  readonly description?: string;
  readonly purpose?: string;
  readonly ownerUserId?: EntityId | null;
}

export interface CreateCredentialInput {
  readonly name: string;
  readonly expiresAt?: Timestamp | null;
}

// ─── Agent Audit Events ──────────────────────────────────────────────────

export type AgentAuditAction =
  | "AGENT_CREATED"
  | "AGENT_UPDATED"
  | "AGENT_SUSPENDED"
  | "AGENT_REVOKED"
  | "AGENT_REACTIVATED"
  | "CREDENTIAL_CREATED"
  | "CREDENTIAL_ROTATED"
  | "CREDENTIAL_REVOKED"
  | "AGENT_AUTHENTICATED"
  | "AGENT_AUTH_FAILED"
  | "CAPABILITY_GRANTED"
  | "CAPABILITY_REVOKED"
  | "AGENT_SESSION_CREATED"
  | "AGENT_SESSION_REVOKED";
