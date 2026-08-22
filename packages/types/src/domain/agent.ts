/* ContextGraph — Agent Orchestration domain types (Phase 15). */

import type {
  EntityId,
  Metadata,
  Milliseconds,
  Score,
  Timestamp,
} from "../primitives";

// ---------------------------------------------------------------------------
// Agent Execution Status
// ---------------------------------------------------------------------------

export const AgentExecutionStatus = {
  PENDING: "PENDING",
  INITIALIZING: "INITIALIZING",
  PLANNING: "PLANNING",
  REQUESTING_CONTEXT: "REQUESTING_CONTEXT",
  EXECUTING_TOOL: "EXECUTING_TOOL",
  OBSERVING: "OBSERVING",
  VERIFYING: "VERIFYING",
  GENERATING_RESPONSE: "GENERATING_RESPONSE",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  TIMEOUT: "TIMEOUT",
  POLICY_BLOCKED: "POLICY_BLOCKED",
} as const;
export type AgentExecutionStatus =
  (typeof AgentExecutionStatus)[keyof typeof AgentExecutionStatus];

// ---------------------------------------------------------------------------
// Agent Plan Step Types
// ---------------------------------------------------------------------------

export const AgentStepType = {
  CONTEXT_REQUEST: "CONTEXT_REQUEST",
  TOOL_CALL: "TOOL_CALL",
  ANALYSIS: "ANALYSIS",
  VERIFICATION: "VERIFICATION",
  FINAL_RESPONSE: "FINAL_RESPONSE",
} as const;
export type AgentStepType = (typeof AgentStepType)[keyof typeof AgentStepType];

// ---------------------------------------------------------------------------
// Agent Plan Step Status
// ---------------------------------------------------------------------------

export const AgentStepStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  BLOCKED: "BLOCKED",
} as const;
export type AgentStepStatus =
  (typeof AgentStepStatus)[keyof typeof AgentStepStatus];

// ---------------------------------------------------------------------------
// Tool Status
// ---------------------------------------------------------------------------

export const ToolCallStatus = {
  PENDING: "PENDING",
  VALIDATING: "VALIDATING",
  AUTHORIZING: "AUTHORIZING",
  EXECUTING: "EXECUTING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  DENIED: "DENIED",
  TIMEOUT: "TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
} as const;
export type ToolCallStatus =
  (typeof ToolCallStatus)[keyof typeof ToolCallStatus];

// ---------------------------------------------------------------------------
// Tool Failure Reason
// ---------------------------------------------------------------------------

export const ToolFailureReason = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  TIMEOUT: "TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
  DEPENDENCY_ERROR: "DEPENDENCY_ERROR",
  EXECUTION_ERROR: "EXECUTION_ERROR",
} as const;
export type ToolFailureReason =
  (typeof ToolFailureReason)[keyof typeof ToolFailureReason];

// ---------------------------------------------------------------------------
// Action Risk Classification
// ---------------------------------------------------------------------------

export const ActionRiskLevel = {
  READ_ONLY: "READ_ONLY",
  LOW_RISK_WRITE: "LOW_RISK_WRITE",
  HIGH_RISK_WRITE: "HIGH_RISK_WRITE",
  EXTERNAL_SIDE_EFFECT: "EXTERNAL_SIDE_EFFECT",
} as const;
export type ActionRiskLevel =
  (typeof ActionRiskLevel)[keyof typeof ActionRiskLevel];

// ---------------------------------------------------------------------------
// Agent Capabilities
// ---------------------------------------------------------------------------

export const AgentCapability = {
  CONTEXT_READ: "CONTEXT_READ",
  GRAPH_READ: "GRAPH_READ",
  KNOWLEDGE_READ: "KNOWLEDGE_READ",
  DOCUMENT_READ: "DOCUMENT_READ",
  POLICY_READ: "POLICY_READ",
  CALCULATOR: "CALCULATOR",
  KNOWLEDGE_WRITE: "KNOWLEDGE_WRITE",
  DOCUMENT_WRITE: "DOCUMENT_WRITE",
  EMAIL_SEND: "EMAIL_SEND",
} as const;
export type AgentCapability =
  (typeof AgentCapability)[keyof typeof AgentCapability];

// ---------------------------------------------------------------------------
// Verification Result
// ---------------------------------------------------------------------------

export const VerificationStatus = {
  PASSED: "PASSED",
  FAILED: "FAILED",
  WARNING: "WARNING",
  SKIPPED: "SKIPPED",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

// ---------------------------------------------------------------------------
// Human Approval Status
// ---------------------------------------------------------------------------

export const ApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type ApprovalStatus =
  (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

// ---------------------------------------------------------------------------
// Agent Execution
// ---------------------------------------------------------------------------

export interface AgentExecution {
  readonly executionId: EntityId;
  readonly userId: EntityId;
  readonly organizationId: EntityId;
  readonly workspaceId: EntityId;
  readonly userRequest: string;
  readonly status: AgentExecutionStatus;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly iterationCount: number;
  readonly toolCallCount: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCost: number;
  readonly finalResponse: string | null;
  readonly errorMessage: string | null;
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly completedAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Agent Step (persisted)
// ---------------------------------------------------------------------------

export interface AgentStepRecord {
  readonly stepId: EntityId;
  readonly executionId: EntityId;
  readonly stepIndex: number;
  readonly stepType: AgentStepType;
  readonly purpose: string;
  readonly toolName: string | null;
  readonly status: AgentStepStatus;
  readonly input: Metadata;
  readonly output: Metadata | null;
  readonly errorMessage: string | null;
  readonly durationMs: Milliseconds | null;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Agent Tool Call Record (persisted)
// ---------------------------------------------------------------------------

export interface AgentToolCallRecord {
  readonly toolCallId: EntityId;
  readonly executionId: EntityId;
  readonly stepId: EntityId;
  readonly toolName: string;
  readonly input: Metadata;
  readonly output: Metadata | null;
  readonly status: ToolCallStatus;
  readonly failureReason: ToolFailureReason | null;
  readonly policyDecision: string | null;
  readonly durationMs: Milliseconds | null;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Agent Observation Record (persisted)
// ---------------------------------------------------------------------------

export interface AgentObservationRecord {
  readonly observationId: EntityId;
  readonly executionId: EntityId;
  readonly stepId: EntityId;
  readonly toolName: string;
  readonly summary: string;
  readonly data: Metadata;
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Agent Verification Record (persisted)
// ---------------------------------------------------------------------------

export interface AgentVerificationRecord {
  readonly verificationId: EntityId;
  readonly executionId: EntityId;
  readonly stepId: EntityId;
  readonly checkType: string;
  readonly status: VerificationStatus;
  readonly details: Metadata;
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Agent Trace Entry (for API / dashboard)
// ---------------------------------------------------------------------------

export interface AgentTraceEntry {
  readonly timestamp: Timestamp;
  readonly eventType: string;
  readonly summary: string;
  readonly stepIndex: number | null;
  readonly metadata: Metadata;
}

// ---------------------------------------------------------------------------
// Agent Analytics
// ---------------------------------------------------------------------------

export interface AgentAnalytics {
  readonly totalExecutions: number;
  readonly completedExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly averageDurationMs: Milliseconds;
  readonly averageIterations: number;
  readonly averageToolCalls: number;
  readonly totalToolCalls: number;
  readonly toolFailures: number;
  readonly policyDenials: number;
  readonly averageContextSize: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly estimatedTotalCost: number;
  readonly verificationFailures: number;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
}

// ---------------------------------------------------------------------------
// Agent Capability Model
// ---------------------------------------------------------------------------

export interface AgentCapabilitySet {
  readonly capabilities: readonly AgentCapability[];
  readonly maxIterations: number;
  readonly maxToolCalls: number;
  readonly maxTokens: number;
  readonly maxCost: number;
  readonly maxDurationMs: Milliseconds;
  readonly allowedTools: readonly string[];
  readonly blockedTools: readonly string[];
}

// ---------------------------------------------------------------------------
// Tool Request (internal — never reaches the LLM)
// ---------------------------------------------------------------------------

export interface ToolRequest {
  readonly toolCallId: EntityId;
  readonly toolName: string;
  readonly input: Record<string, unknown>;
  readonly executionId: EntityId;
  readonly userId: EntityId;
  readonly organizationId: EntityId;
  readonly workspaceId: EntityId;
}

// ---------------------------------------------------------------------------
// Tool Result (returned to runtime, NOT directly to LLM)
// ---------------------------------------------------------------------------

export interface ToolResult {
  readonly toolCallId: EntityId;
  readonly toolName: string;
  readonly status: ToolCallStatus;
  readonly data: Record<string, unknown> | null;
  readonly metadata: Metadata;
  readonly executionTime: Milliseconds;
  readonly policyDecision: string | null;
  readonly error: string | null;
  readonly failureReason: ToolFailureReason | null;
}

// ---------------------------------------------------------------------------
// Observation (structured, bounded)
// ---------------------------------------------------------------------------

export interface AgentObservation {
  readonly toolName: string;
  readonly summary: string;
  readonly data: Record<string, unknown>;
  readonly authorizedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Model Generation Request (for planner)
// ---------------------------------------------------------------------------

export interface AgentModelRequest {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseFormat: "json" | "text";
}

// ---------------------------------------------------------------------------
// Model Generation Response
// ---------------------------------------------------------------------------

export interface AgentModelResponse {
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly model: string;
  readonly provider: string;
  readonly durationMs: Milliseconds;
}

// ---------------------------------------------------------------------------
// Prompt Injection Detection
// ---------------------------------------------------------------------------

export interface InjectionDetectionResult {
  readonly detected: boolean;
  readonly patterns: readonly string[];
  readonly confidence: Score;
  readonly action: "BLOCK" | "SANITIZE" | "ALLOW";
}

// ---------------------------------------------------------------------------
// Allowed state transitions (const for runtime enforcement)
// ---------------------------------------------------------------------------

export const VALID_TRANSITIONS: Record<
  AgentExecutionStatus,
  readonly AgentExecutionStatus[]
> = {
  PENDING: [AgentExecutionStatus.INITIALIZING],
  INITIALIZING: [
    AgentExecutionStatus.PLANNING,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
  ],
  PLANNING: [
    AgentExecutionStatus.REQUESTING_CONTEXT,
    AgentExecutionStatus.EXECUTING_TOOL,
    AgentExecutionStatus.VERIFYING,
    AgentExecutionStatus.GENERATING_RESPONSE,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
    AgentExecutionStatus.POLICY_BLOCKED,
  ],
  REQUESTING_CONTEXT: [
    AgentExecutionStatus.EXECUTING_TOOL,
    AgentExecutionStatus.OBSERVING,
    AgentExecutionStatus.PLANNING,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
    AgentExecutionStatus.POLICY_BLOCKED,
  ],
  EXECUTING_TOOL: [
    AgentExecutionStatus.OBSERVING,
    AgentExecutionStatus.PLANNING,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
    AgentExecutionStatus.TIMEOUT,
    AgentExecutionStatus.POLICY_BLOCKED,
    AgentExecutionStatus.AWAITING_APPROVAL,
  ],
  OBSERVING: [
    AgentExecutionStatus.PLANNING,
    AgentExecutionStatus.VERIFYING,
    AgentExecutionStatus.GENERATING_RESPONSE,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
  ],
  VERIFYING: [
    AgentExecutionStatus.GENERATING_RESPONSE,
    AgentExecutionStatus.PLANNING,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
  ],
  GENERATING_RESPONSE: [
    AgentExecutionStatus.COMPLETED,
    AgentExecutionStatus.VERIFYING,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
  ],
  AWAITING_APPROVAL: [
    AgentExecutionStatus.EXECUTING_TOOL,
    AgentExecutionStatus.FAILED,
    AgentExecutionStatus.CANCELLED,
  ],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  TIMEOUT: [],
  POLICY_BLOCKED: [],
};
