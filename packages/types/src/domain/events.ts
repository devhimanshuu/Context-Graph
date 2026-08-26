/* Domain event types — event-driven layer for ContextGraph.

Events communicate state changes. They are NOT the source of truth.
The authoritative state remains in PostgreSQL. */

// ─── Event Type Taxonomy ─────────────────────────────────────────────────────

export const EventType = {
  // Context resolution
  CONTEXT_RESOLUTION_STARTED: "CONTEXT_RESOLUTION_STARTED",
  CONTEXT_RESOLUTION_COMPLETED: "CONTEXT_RESOLUTION_COMPLETED",
  CONTEXT_RESOLUTION_FAILED: "CONTEXT_RESOLUTION_FAILED",

  // Action guardrails
  ACTION_CHECKED: "ACTION_CHECKED",
  ACTION_BLOCKED: "ACTION_BLOCKED",
  ACTION_APPROVAL_REQUIRED: "ACTION_APPROVAL_REQUIRED",

  // Knowledge proposals
  NODE_PROPOSED: "NODE_PROPOSED",
  NODE_APPROVED: "NODE_APPROVED",
  NODE_REJECTED: "NODE_REJECTED",
  NODE_PUBLISHED: "NODE_PUBLISHED",
  NODE_ARCHIVED: "NODE_ARCHIVED",
  NODE_UPDATED: "NODE_UPDATED",

  // Indexing
  INDEXING_STARTED: "INDEXING_STARTED",
  INDEXING_COMPLETED: "INDEXING_COMPLETED",
  INDEXING_FAILED: "INDEXING_FAILED",

  // Pipeline
  PIPELINE_COMPLETED: "PIPELINE_COMPLETED",
  PIPELINE_FAILED: "PIPELINE_FAILED",
  RUN_REPLAYED: "RUN_REPLAYED",

  // MCP
  MCP_TOOL_CALLED: "MCP_TOOL_CALLED",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

// ─── Event Source ────────────────────────────────────────────────────────────

export const EventSource = {
  REST: "REST",
  MCP: "MCP",
  SYSTEM: "SYSTEM",
  WORKER: "WORKER",
  AGENT: "AGENT",
  ADMIN: "ADMIN",
} as const;
export type EventSource = (typeof EventSource)[keyof typeof EventSource];

// ─── Event Classification ────────────────────────────────────────────────────

export const EventClassification = {
  PUBLIC_TO_ORG: "PUBLIC_TO_ORG",
  INTERNAL: "INTERNAL",
  RESTRICTED: "RESTRICTED",
  SYSTEM_INTERNAL: "SYSTEM_INTERNAL",
} as const;
export type EventClassification =
  (typeof EventClassification)[keyof typeof EventClassification];

// ─── Aggregate Types ─────────────────────────────────────────────────────────

export const AggregateType = {
  PipelineRun: "PipelineRun",
  NodeProposal: "NodeProposal",
  KnowledgeNode: "KnowledgeNode",
  ActionCheck: "ActionCheck",
  AgentExecution: "AgentExecution",
  MCPSession: "MCPSession",
  Organization: "Organization",
} as const;
export type AggregateType = (typeof AggregateType)[keyof typeof AggregateType];

// ─── Event Envelope ──────────────────────────────────────────────────────────

export interface DomainEventEnvelope {
  readonly eventId: string;
  readonly eventType: EventType;
  readonly eventVersion: number;
  readonly organizationId: string;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  readonly actorId: string | null;
  readonly actorType: string | null;
  readonly source: EventSource;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly classification: EventClassification;
}

// ─── Outbox Event ────────────────────────────────────────────────────────────

export const OutboxEventStatus = {
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
  DEAD_LETTER: "DEAD_LETTER",
} as const;
export type OutboxEventStatus =
  (typeof OutboxEventStatus)[keyof typeof OutboxEventStatus];

export interface OutboxEventEntity {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: EventType;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  readonly organizationId: string;
  readonly payload: Record<string, unknown>;
  readonly status: OutboxEventStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly availableAt: string;
  readonly createdAt: string;
  readonly publishedAt: string | null;
  readonly lastError: string | null;
}

// ─── Event Subscription ──────────────────────────────────────────────────────

export const SubscriptionClientType = {
  DASHBOARD: "DASHBOARD",
  MCP: "MCP",
  AGENT: "AGENT",
  SYSTEM: "SYSTEM",
} as const;
export type SubscriptionClientType =
  (typeof SubscriptionClientType)[keyof typeof SubscriptionClientType];

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export interface EventSubscriptionEntity {
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly principalId: string;
  readonly clientType: SubscriptionClientType;
  readonly eventTypes: readonly EventType[];
  readonly status: SubscriptionStatus;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly lastEventId: string | null;
}

// ─── SSE Event Format ────────────────────────────────────────────────────────

export interface SseEventData {
  readonly eventId: string;
  readonly eventType: EventType;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

// ─── Event Query Filters ─────────────────────────────────────────────────────

export interface EventQueryFilters {
  readonly organizationId: string;
  readonly eventType?: EventType;
  readonly aggregateType?: AggregateType;
  readonly aggregateId?: string;
  readonly status?: OutboxEventStatus;
  readonly since?: string;
  readonly until?: string;
  readonly limit?: number;
  readonly offset?: number;
}
