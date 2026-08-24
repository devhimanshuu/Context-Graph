/* ContextGraph — Workflow Orchestration domain types (Phase 16). */

import type {
  EntityId,
  Metadata,
  Milliseconds,
  Timestamp,
} from "../primitives";

// ---------------------------------------------------------------------------
// Workflow Definition Status (lifecycle)
// ---------------------------------------------------------------------------

export const WorkflowDefinitionStatus = {
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type WorkflowDefinitionStatus =
  (typeof WorkflowDefinitionStatus)[keyof typeof WorkflowDefinitionStatus];

// ---------------------------------------------------------------------------
// Workflow Execution Status
// ---------------------------------------------------------------------------

export const WorkflowExecutionStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  PAUSED: "PAUSED",
  WAITING_FOR_APPROVAL: "WAITING_FOR_APPROVAL",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  TIMED_OUT: "TIMED_OUT",
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
} as const;
export type WorkflowExecutionStatus =
  (typeof WorkflowExecutionStatus)[keyof typeof WorkflowExecutionStatus];

// ---------------------------------------------------------------------------
// Workflow Node Execution Status
// ---------------------------------------------------------------------------

export const NodeExecutionStatus = {
  PENDING: "PENDING",
  READY: "READY",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  CANCELLED: "CANCELLED",
} as const;
export type NodeExecutionStatus =
  (typeof NodeExecutionStatus)[keyof typeof NodeExecutionStatus];

// ---------------------------------------------------------------------------
// Workflow Node Types
// ---------------------------------------------------------------------------

export const WorkflowNodeType = {
  START: "START",
  AGENT: "AGENT",
  CONTEXT_REQUEST: "CONTEXT_REQUEST",
  TOOL: "TOOL",
  CONDITION: "CONDITION",
  PARALLEL: "PARALLEL",
  MERGE: "MERGE",
  HUMAN_APPROVAL: "HUMAN_APPROVAL",
  VERIFICATION: "VERIFICATION",
  END: "END",
} as const;
export type WorkflowNodeType =
  (typeof WorkflowNodeType)[keyof typeof WorkflowNodeType];

// ---------------------------------------------------------------------------
// Merge Strategy
// ---------------------------------------------------------------------------

export const MergeStrategy = {
  ALL_REQUIRED: "ALL_REQUIRED",
  ANY_REQUIRED: "ANY_REQUIRED",
  QUORUM: "QUORUM",
} as const;
export type MergeStrategy = (typeof MergeStrategy)[keyof typeof MergeStrategy];

// ---------------------------------------------------------------------------
// Failure Policy
// ---------------------------------------------------------------------------

export const FailurePolicy = {
  FAIL_WORKFLOW: "FAIL_WORKFLOW",
  RETRY_NODE: "RETRY_NODE",
  SKIP_NODE: "SKIP_NODE",
  CONTINUE_WITH_PARTIAL: "CONTINUE_WITH_PARTIAL",
  WAIT_FOR_HUMAN: "WAIT_FOR_HUMAN",
} as const;
export type FailurePolicy = (typeof FailurePolicy)[keyof typeof FailurePolicy];

// ---------------------------------------------------------------------------
// Retry Backoff Strategy
// ---------------------------------------------------------------------------

export const BackoffStrategy = {
  FIXED: "FIXED",
  LINEAR: "LINEAR",
  EXPONENTIAL: "EXPONENTIAL",
} as const;
export type BackoffStrategy =
  (typeof BackoffStrategy)[keyof typeof BackoffStrategy];

// ---------------------------------------------------------------------------
// Workflow Event Types
// ---------------------------------------------------------------------------

export const WorkflowEventType = {
  WORKFLOW_STARTED: "WORKFLOW_STARTED",
  NODE_STARTED: "NODE_STARTED",
  NODE_COMPLETED: "NODE_COMPLETED",
  NODE_FAILED: "NODE_FAILED",
  NODE_RETRIED: "NODE_RETRIED",
  NODE_SKIPPED: "NODE_SKIPPED",
  WORKFLOW_PAUSED: "WORKFLOW_PAUSED",
  WORKFLOW_RESUMED: "WORKFLOW_RESUMED",
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED",
  APPROVAL_RESOLVED: "APPROVAL_RESOLVED",
  WORKFLOW_COMPLETED: "WORKFLOW_COMPLETED",
  WORKFLOW_FAILED: "WORKFLOW_FAILED",
  WORKFLOW_CANCELLED: "WORKFLOW_CANCELLED",
  WORKFLOW_TIMED_OUT: "WORKFLOW_TIMED_OUT",
  CONDITION_EVALUATED: "CONDITION_EVALUATED",
  PARALLEL_STARTED: "PARALLEL_STARTED",
  MERGE_COMPLETED: "MERGE_COMPLETED",
  CHECKPOINT_CREATED: "CHECKPOINT_CREATED",
  RECOVERY_STARTED: "RECOVERY_STARTED",
} as const;
export type WorkflowEventType =
  (typeof WorkflowEventType)[keyof typeof WorkflowEventType];

// ---------------------------------------------------------------------------
// Workflow Definition
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  readonly workflowId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly status: WorkflowDefinitionStatus;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly inputSchema: Metadata;
  readonly outputSchema: Metadata;
  readonly executionPolicy: WorkflowExecutionPolicy;
  readonly organizationId: EntityId;
  readonly createdBy: EntityId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Workflow Node
// ---------------------------------------------------------------------------

export interface WorkflowNode {
  readonly nodeId: EntityId;
  readonly type: WorkflowNodeType;
  readonly name: string;
  readonly configuration: Metadata;
  readonly dependencies: readonly EntityId[];
  readonly timeoutMs: Milliseconds;
  readonly retryPolicy: RetryPolicy;
  readonly failurePolicy: FailurePolicy;
}

// ---------------------------------------------------------------------------
// Workflow Edge
// ---------------------------------------------------------------------------

export interface WorkflowEdge {
  readonly edgeId: EntityId;
  readonly sourceNodeId: EntityId;
  readonly targetNodeId: EntityId;
  readonly condition: string | null;
}

// ---------------------------------------------------------------------------
// Retry Policy
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly baseDelayMs: Milliseconds;
  readonly maxDelayMs: Milliseconds;
  readonly retryableErrors: readonly string[];
  readonly nonRetryableErrors: readonly string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: BackoffStrategy.EXPONENTIAL,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  retryableErrors: ["TIMEOUT", "DEPENDENCY_ERROR"],
  nonRetryableErrors: ["AUTHORIZATION_DENIED", "VALIDATION_ERROR"],
};

// ---------------------------------------------------------------------------
// Workflow Execution Policy
// ---------------------------------------------------------------------------

export interface WorkflowExecutionPolicy {
  readonly maxNodes: number;
  readonly maxParallelNodes: number;
  readonly maxAgentCalls: number;
  readonly maxToolCalls: number;
  readonly maxIterations: number;
  readonly maxTokens: number;
  readonly maxCost: number;
  readonly maxDurationMs: Milliseconds;
}

export const DEFAULT_WORKFLOW_EXECUTION_POLICY: WorkflowExecutionPolicy = {
  maxNodes: 50,
  maxParallelNodes: 10,
  maxAgentCalls: 20,
  maxToolCalls: 100,
  maxIterations: 30,
  maxTokens: 100_000,
  maxCost: 10.0,
  maxDurationMs: 600_000,
};

// ---------------------------------------------------------------------------
// Workflow Execution
// ---------------------------------------------------------------------------

export interface WorkflowExecution {
  readonly executionId: EntityId;
  readonly workflowId: EntityId;
  readonly workflowVersion: number;
  readonly organizationId: EntityId;
  readonly userId: EntityId;
  readonly workspaceId: EntityId | null;
  readonly status: WorkflowExecutionStatus;
  readonly input: Metadata;
  readonly output: Metadata | null;
  readonly currentNodes: readonly EntityId[];
  readonly completedNodes: readonly EntityId[];
  readonly failedNodes: readonly EntityId[];
  readonly error: string | null;
  readonly tokenUsage: number;
  readonly estimatedCost: number;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Node Execution
// ---------------------------------------------------------------------------

export interface NodeExecution {
  readonly nodeExecutionId: EntityId;
  readonly executionId: EntityId;
  readonly nodeId: EntityId;
  readonly nodeName: string;
  readonly nodeType: WorkflowNodeType;
  readonly status: NodeExecutionStatus;
  readonly attempt: number;
  readonly input: Metadata;
  readonly output: Metadata | null;
  readonly error: string | null;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly durationMs: Milliseconds | null;
}

// ---------------------------------------------------------------------------
// Workflow Checkpoint
// ---------------------------------------------------------------------------

export interface WorkflowCheckpoint {
  readonly checkpointId: EntityId;
  readonly executionId: EntityId;
  readonly sequence: number;
  readonly workflowVersion: number;
  readonly stateHash: string;
  readonly stateSnapshot: Metadata;
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Workflow Event
// ---------------------------------------------------------------------------

export interface WorkflowEvent {
  readonly eventId: EntityId;
  readonly executionId: EntityId;
  readonly nodeId: EntityId | null;
  readonly eventType: WorkflowEventType;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

// ---------------------------------------------------------------------------
// Workflow Approval Request
// ---------------------------------------------------------------------------

export interface WorkflowApprovalRequest {
  readonly approvalId: EntityId;
  readonly executionId: EntityId;
  readonly nodeExecutionId: EntityId;
  readonly nodeId: EntityId;
  readonly requestedAction: string;
  readonly riskLevel: string;
  readonly requestedBy: EntityId;
  readonly status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  readonly approver: EntityId | null;
  readonly createdAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Agent Capability Isolation for Specialized Agents
// ---------------------------------------------------------------------------

export const SpecializedAgentType = {
  RESEARCHER: "RESEARCHER",
  ANALYST: "ANALYST",
  RETRIEVER: "RETRIEVER",
  VERIFIER: "VERIFIER",
  SYNTHESIZER: "SYNTHESIZER",
} as const;
export type SpecializedAgentType =
  (typeof SpecializedAgentType)[keyof typeof SpecializedAgentType];

export interface SpecializedAgentDefinition {
  readonly type: SpecializedAgentType;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly allowedTools: readonly string[];
  readonly maxIterations: number;
  readonly maxToolCalls: number;
  readonly maxTokens: number;
  readonly inputSchema: Metadata;
  readonly outputSchema: Metadata;
}

// ---------------------------------------------------------------------------
// Workflow Transition Rules (state machine)
// ---------------------------------------------------------------------------

export const WORKFLOW_VALID_TRANSITIONS: Record<
  WorkflowExecutionStatus,
  readonly WorkflowExecutionStatus[]
> = {
  PENDING: ["RUNNING", "CANCELLED", "FAILED"],
  RUNNING: [
    "WAITING",
    "PAUSED",
    "WAITING_FOR_APPROVAL",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
    "RECOVERY_REQUIRED",
  ],
  WAITING: [
    "RUNNING",
    "PAUSED",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
    "RECOVERY_REQUIRED",
  ],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  WAITING_FOR_APPROVAL: ["RUNNING", "FAILED", "CANCELLED", "TIMED_OUT"],
  COMPLETED: [],
  FAILED: ["RECOVERY_REQUIRED"],
  CANCELLED: [],
  TIMED_OUT: ["RECOVERY_REQUIRED"],
  RECOVERY_REQUIRED: ["RUNNING", "FAILED", "CANCELLED"],
};

export const NODE_VALID_TRANSITIONS: Record<
  NodeExecutionStatus,
  readonly NodeExecutionStatus[]
> = {
  PENDING: ["READY", "SKIPPED", "CANCELLED"],
  READY: ["RUNNING", "SKIPPED", "CANCELLED"],
  RUNNING: ["COMPLETED", "FAILED", "WAITING", "CANCELLED"],
  WAITING: ["RUNNING", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: ["READY", "CANCELLED"],
  SKIPPED: [],
  CANCELLED: [],
};
