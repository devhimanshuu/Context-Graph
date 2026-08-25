/* MCP (Model Context Protocol) types — shared contracts for the MCP server adapter. */

import type { EntityId, Metadata, Timestamp } from "../primitives";

// ─── MCP Capabilities ────────────────────────────────────────────────────────

export const McpCapability = {
  CONTEXT_RESOLVE: "context.resolve",
  GRAPH_READ: "graph.read",
  PIPELINE_READ: "pipeline.read",
  PIPELINE_REPLAY: "pipeline.replay",
} as const;
export type McpCapability = (typeof McpCapability)[keyof typeof McpCapability];

// ─── MCP Session ─────────────────────────────────────────────────────────────

export interface McpSession {
  /** Unique session identifier. */
  readonly sessionId: string;
  /** Authenticated principal ID (derived server-side, NEVER from client). */
  readonly principalId: EntityId;
  /** Organization ID (derived server-side). */
  readonly organizationId: EntityId;
  /** Service account ID where applicable (future: agent identity). */
  readonly serviceAccountId: EntityId | null;
  /** Capabilities granted to this session. */
  readonly capabilities: readonly McpCapability[];
  /** Authentication method used. */
  readonly authMethod: McpAuthMethod;
  /** Session creation timestamp. */
  readonly createdAt: Timestamp;
  /** Session expiry. */
  readonly expiresAt: Timestamp;
}

export const McpAuthMethod = {
  JWT: "jwt",
  API_KEY: "api_key",
  SERVICE_ACCOUNT: "service_account",
  DEVELOPMENT: "development",
} as const;
export type McpAuthMethod = (typeof McpAuthMethod)[keyof typeof McpAuthMethod];

// ─── MCP Tool Definitions ────────────────────────────────────────────────────

export interface McpToolDefinition {
  /** Unique tool name. */
  readonly name: string;
  /** Human-readable description. */
  readonly description: string;
  /** Required capabilities to use this tool. */
  readonly requiredCapabilities: readonly McpCapability[];
  /** Input JSON schema for validation. */
  readonly inputSchema: Record<string, unknown>;
  /** Whether this tool is read-only (safe for unattended execution). */
  readonly readOnly: boolean;
}

// ─── MCP Tool Result ─────────────────────────────────────────────────────────

export const McpToolResultStatus = {
  SUCCESS: "success",
  AUTHENTICATION_REQUIRED: "authentication_required",
  ACCESS_DENIED: "access_denied",
  INVALID_INPUT: "invalid_input",
  RESOURCE_NOT_FOUND: "resource_not_found",
  RATE_LIMITED: "rate_limited",
  PIPELINE_FAILED: "pipeline_failed",
  INTERNAL_ERROR: "internal_error",
} as const;
export type McpToolResultStatus =
  (typeof McpToolResultStatus)[keyof typeof McpToolResultStatus];

export interface McpToolResult {
  /** Tool call ID for correlation. */
  readonly toolCallId: string;
  /** Tool name. */
  readonly toolName: string;
  /** Result status. */
  readonly status: McpToolResultStatus;
  /** Result data (only on success). */
  readonly data?: unknown;
  /** Safe error message (on failure). */
  readonly error?: string;
  /** Execution metadata. */
  readonly metadata: McpToolResultMetadata;
}

export interface McpToolResultMetadata {
  readonly executionTimeMs: number;
  readonly organizationId: EntityId;
  readonly principalId: EntityId;
  readonly pipelineRunId?: string;
  readonly timestamp: Timestamp;
}

// ─── MCP Tool Inputs ─────────────────────────────────────────────────────────

export interface McpResolveContextInput {
  readonly query: string;
  readonly workspaceId: EntityId;
  readonly entryNodeId?: EntityId;
  readonly topK?: number;
  readonly maxCandidates?: number;
  readonly retrievalMode?: "bfs" | "dfs";
  readonly tokenBudget?: number;
  readonly executionMode?: "STANDARD" | "DEBUG" | "AUDIT";
}

export interface McpGetSubgraphInput {
  readonly nodeId: EntityId;
  readonly workspaceId: EntityId;
  readonly maxDepth?: number;
  readonly direction?: "outgoing" | "incoming" | "both";
  readonly includeMetadata?: boolean;
}

export interface McpGetRunInput {
  readonly runId: EntityId;
}

export interface McpReplayRunInput {
  readonly runId: EntityId;
  /** Optional replay configuration override. */
  readonly options?: {
    readonly executionMode?: "STANDARD" | "DEBUG" | "AUDIT";
    readonly tokenBudget?: number;
  };
}

// ─── MCP Audit ───────────────────────────────────────────────────────────────

export interface McpAuditEvent {
  readonly id: EntityId;
  readonly sessionId: string;
  readonly principalId: EntityId;
  readonly organizationId: EntityId;
  readonly toolName: string;
  readonly requestId: string;
  readonly outcome: "success" | "denied" | "error";
  readonly latencyMs: number;
  readonly pipelineRunId?: string;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

// ─── MCP Response Formats ────────────────────────────────────────────────────

export interface McpContextItem {
  readonly nodeId: EntityId;
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly importance: number;
  readonly distance: number;
  readonly content: string;
  readonly complianceTags: readonly string[];
  readonly inclusionReason: string;
  readonly tokens: number;
}

export interface McpContextResponse {
  readonly packageId: string;
  readonly requestId: string;
  readonly pipelineRunId: string;
  readonly contextItems: readonly McpContextItem[];
  readonly summary: {
    readonly totalCandidates: number;
    readonly includedCandidates: number;
    readonly totalTokens: number;
    readonly truncated: boolean;
  };
  readonly funnel: {
    readonly reachable: number;
    readonly authorized: number;
    readonly ruleCandidates: number;
    readonly included: number;
  };
}

export interface McpGraphNode {
  readonly id: EntityId;
  readonly title: string;
  readonly type: string;
  readonly distance: number;
}

export interface McpGraphEdge {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly relationship: string;
  readonly weight?: number;
}

export interface McpSubgraphResponse {
  readonly entryNodeId: EntityId;
  readonly nodes: readonly McpGraphNode[];
  readonly edges: readonly McpGraphEdge[];
  readonly metadata: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly maxDepth: number;
    readonly filteredNodes: number;
  };
}

export interface McpRunResponse {
  readonly runId: string;
  readonly status: string;
  readonly pipelineVersion: string;
  readonly mode: string;
  readonly strategy: string;
  readonly evaluatedAt: string;
  readonly createdAt: string;
  readonly stageSummary: ReadonlyArray<{
    readonly stageName: string;
    readonly status: string;
    readonly durationMs: number;
    readonly outputCount: number | null;
  }>;
  readonly metrics: {
    readonly totalDurationMs: number;
    readonly reachableNodes: number;
    readonly includedCandidates: number;
    readonly tokensUsed: number;
  } | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}
