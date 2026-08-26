/* Node proposal types — governed agent write-back to ContextGraph.

Agents submit proposals. ContextGraph validates and persists only allowed knowledge. */

import { DataClassification } from "./governance";

// ─── Proposal Status ─────────────────────────────────────────────────────────

export const ProposalStatus = {
  PROPOSED: "PROPOSED",
  VALIDATING: "VALIDATING",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PERSISTING: "PERSISTING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProposalStatus =
  (typeof ProposalStatus)[keyof typeof ProposalStatus];

// ─── Write Mode ──────────────────────────────────────────────────────────────

export const WriteMode = {
  AUTO_APPROVE: "AUTO_APPROVE",
  REQUIRES_APPROVAL: "REQUIRES_APPROVAL",
  MANUAL_ONLY: "MANUAL_ONLY",
} as const;
export type WriteMode = (typeof WriteMode)[keyof typeof WriteMode];

// ─── Proposal Decision ───────────────────────────────────────────────────────

export const ProposalDecision = {
  PUBLISHED: "PUBLISHED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
  DUPLICATE: "DUPLICATE",
  FAILED: "FAILED",
} as const;
export type ProposalDecision =
  (typeof ProposalDecision)[keyof typeof ProposalDecision];

// ─── Proposal Node Type (writable subset) ────────────────────────────────────

export const WritableNodeType = {
  FACT: "FACT",
  DECISION: "DECISION",
} as const;
export type WritableNodeType =
  (typeof WritableNodeType)[keyof typeof WritableNodeType];

// ─── Write Capability ────────────────────────────────────────────────────────

export const WriteCapability = {
  KNOWLEDGE_PROPOSE: "knowledge.propose",
  KNOWLEDGE_WRITE: "knowledge.write",
  KNOWLEDGE_CREATE: "knowledge.create",
  KNOWLEDGE_PUBLISH: "knowledge.publish",
  DECISION_PROPOSE: "decision.propose",
} as const;
export type WriteCapability =
  (typeof WriteCapability)[keyof typeof WriteCapability];

// ─── Relationship Proposal ───────────────────────────────────────────────────

export interface RelationshipProposal {
  /** UUID of the existing target node in the graph. */
  readonly targetNodeId: string;
  /** Relationship type (SUPPORTS, REQUIRES, DERIVED_FROM, etc). */
  readonly relationshipType: string;
  /** Optional traversal weight (0-1). */
  readonly weight?: number;
  /** Optional metadata attached to the edge. */
  readonly metadata?: Record<string, unknown>;
}

// ─── Source Provenance ───────────────────────────────────────────────────────

export interface SourceReference {
  /** Existing knowledge node this proposal derives from. */
  readonly sourceNodeId?: string;
  /** Document from ingestion. */
  readonly sourceDocumentId?: string;
  /** Pipeline run that surfaced the information. */
  readonly sourcePipelineRunId?: string;
  /** Agent execution that generated the proposal. */
  readonly sourceAgentExecutionId?: string;
  /** MCP session that submitted the proposal. */
  readonly sourceMcpSessionId?: string;
  /** External URL or reference. */
  readonly sourceExternalReference?: string;
  /** Human-readable description. */
  readonly description?: string;
}

// ─── Proposal Request (what the agent submits) ──────────────────────────────

export interface NodeProposalRequest {
  /** Node type — only FACT and DECISION are allowed. */
  readonly nodeType: WritableNodeType;
  /** Short, descriptive title (1-300 chars). */
  readonly title: string;
  /** Full content body. */
  readonly content: string;
  /** Data classification (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED). */
  readonly classification: DataClassification;
  /** Target workspace. */
  readonly workspaceId: string;
  /** Optional department association. */
  readonly departmentId?: string | null;
  /** Structured metadata. */
  readonly metadata?: Record<string, unknown>;
  /** Compliance tags (HIPAA, GDPR, etc). */
  readonly complianceTags?: readonly string[];
  /** Source provenance. */
  readonly sourceReferences?: readonly SourceReference[];
  /** Relationships to propose (new node → existing nodes). */
  readonly relationshipRequests?: readonly RelationshipProposal[];
  /** Why this knowledge is being proposed. */
  readonly purpose?: string;
  /** Client-supplied idempotency key (unique per principal+org). */
  readonly idempotencyKey?: string;
}

// ─── Persisted Proposal ─────────────────────────────────────────────────────

export interface NodeProposalEntity {
  readonly id: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly proposedById: string | null;
  readonly agentIdentityId: string | null;
  readonly agentMcpSessionId: string | null;
  readonly nodeType: string;
  readonly title: string;
  readonly content: string;
  readonly contentHash: string;
  readonly classification: string;
  readonly departmentId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly sourceReferences: readonly SourceReference[];
  readonly status: ProposalStatus;
  readonly decision: ProposalDecision | null;
  readonly decisionReason: string | null;
  readonly publishedNodeId: string | null;
  readonly writeRunId: string | null;
  readonly idempotencyKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ─── Proposal Relationship (persisted) ──────────────────────────────────────

export interface NodeProposalRelationship {
  readonly id: string;
  readonly proposalId: string;
  readonly targetNodeId: string;
  readonly relationshipType: string;
  readonly weight: number;
  readonly metadata: Record<string, unknown>;
}

/** @deprecated Use NodeProposalRelationship */
export type ProposalRelationshipEntity = NodeProposalRelationship;

// ─── Write Run (immutable execution record) ─────────────────────────────────

export interface NodeWriteRunEntity {
  readonly id: string;
  readonly organizationId: string;
  readonly proposalId: string;
  readonly proposalVersion: number;
  readonly status: ProposalStatus;
  readonly decision: ProposalDecision | null;
  readonly validationTrace: readonly ValidationTraceStep[];
  readonly publishedNodeId: string | null;
  readonly relationshipsCreated: number;
  readonly auditEventIds: readonly string[];
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly error: string | null;
}

// ─── Validation Trace ───────────────────────────────────────────────────────

export interface ValidationTraceStep {
  readonly step: string;
  readonly passed: boolean;
  readonly reasonCode?: string;
  readonly explanation?: string;
  readonly durationMs: number;
}

// ─── Approval Request ────────────────────────────────────────────────────────

export interface WriteApprovalRequest {
  readonly approvalId: string;
  readonly proposalId: string;
  readonly organizationId: string;
  readonly requestedAction: string;
  readonly nodeType: string;
  readonly title: string;
  readonly classification: string;
  readonly proposedById: string | null;
  readonly agentIdentityId: string | null;
  readonly status: string;
  readonly createdAt: string;
}

// ─── Proposal Response (returned to agent / API) ────────────────────────────

export interface NodeProposalResponse {
  readonly proposalId: string;
  readonly status: ProposalStatus;
  readonly decision: ProposalDecision;
  readonly nodeId: string | null;
  readonly approvalRequired: boolean;
  readonly reasonCode: string | null;
  readonly validationTrace: readonly ValidationTraceStep[];
  readonly runId: string | null;
}

// ─── Write Mode Policy ───────────────────────────────────────────────────────

export interface WriteModePolicy {
  readonly organizationId: string;
  readonly nodeType: WritableNodeType;
  readonly writeMode: WriteMode;
  readonly allowedClassifications: readonly DataClassification[];
  readonly requiresApprovalAboveClassification: DataClassification | null;
  readonly maxContentLength: number;
  readonly allowedSourceTypes: readonly string[];
}

// ─── Proposal Query Filters ──────────────────────────────────────────────────

export interface ProposalQueryFilters {
  readonly organizationId: string;
  readonly workspaceId?: string;
  readonly status?: ProposalStatus;
  readonly decision?: ProposalDecision;
  readonly nodeType?: WritableNodeType;
  readonly proposedById?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ─── Approval Request Status ─────────────────────────────────────────────────

export const ApprovalRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type ApprovalRequestStatus =
  (typeof ApprovalRequestStatus)[keyof typeof ApprovalRequestStatus];

// ─── Approval Request Entity ─────────────────────────────────────────────────

export interface ApprovalRequestEntity {
  readonly id: string;
  readonly organizationId: string;
  readonly proposalId: string;
  readonly requestedAction: string;
  readonly nodeType: string;
  readonly title: string;
  readonly content: string;
  readonly classification: string;
  readonly proposedById: string | null;
  readonly agentIdentityId: string | null;
  readonly status: ApprovalRequestStatus;
  readonly resolvedById: string | null;
  readonly resolutionNote: string | null;
  readonly publishedNodeId: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
  readonly expiresAt: string | null;
}

// ─── Approval Resolution Request ─────────────────────────────────────────────

export const ApprovalResolution = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ApprovalResolution =
  (typeof ApprovalResolution)[keyof typeof ApprovalResolution];

export interface ResolveApprovalRequest {
  readonly resolution: ApprovalResolution;
  readonly note?: string;
}

export interface ResolveApprovalResponse {
  readonly approvalId: string;
  readonly status: ApprovalRequestStatus;
  readonly publishedNodeId: string | null;
  readonly proposalStatus: ProposalStatus;
}
