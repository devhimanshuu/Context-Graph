/* -----------------------------------------------------------------------
   Agent Playground types — mirroring the MCP + backend response contracts.
   These are read-only DTOs used by the playground UI.
   ----------------------------------------------------------------------- */

// ── MCP Connection ──────────────────────────────────────────────────────

export type McpConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface McpToolInfo {
  name: string
  description: string
  requiredCapabilities: string[]
  readOnly: boolean
  lastInvocationAt: string | null
  invocationCount: number
  inputSchema: Record<string, unknown>
}

export interface McpSessionInfo {
  sessionId: string
  principalId: string
  principalName: string
  organizationId: string
  organizationName: string
  capabilities: string[]
  environment: string
  startedAt: string
  lastActivityAt: string
}

// ── Resolve Context ─────────────────────────────────────────────────────

export interface ResolveContextRequest {
  query: string
  workspaceId: string
  entryNodeId?: string
  topK?: number
  maxCandidates?: number
  retrievalMode?: 'bfs' | 'weighted'
  tokenBudget?: number
  executionMode?: 'STANDARD' | 'DEBUG' | 'AUDIT'
}

export interface ContextItem {
  nodeId: string
  title: string
  type: string
  status: string
  importance: number
  distance: number
  content: string
  complianceTags: string[]
  inclusionReason: string
  tokens: number
  score?: number
  rank?: number
}

export interface ResolveContextResult {
  packageId: string
  requestId: string
  pipelineRunId: string
  contextItems: ContextItem[]
  summary: {
    totalCandidates: number
    includedCandidates: number
    totalTokens: number
    truncated: boolean
  }
  funnel: {
    reachable: number
    authorized: number
    ruleCandidates: number
    included: number
  }
  executionTimeMs: number
}

// ── Check Action ────────────────────────────────────────────────────────

export interface CheckActionRequest {
  action: string
  targetType: string
  targetId?: string
  parameters?: Record<string, unknown>
  purpose?: string
}

export interface GuardrailTraceStep {
  guardrail: string
  passed: boolean
  reason: string
  severity: string
}

export interface CheckActionResult {
  allowed: boolean
  decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL' | 'ERROR'
  action: string
  targetType: string
  targetId: string | null
  riskLevel: string
  reasonCode: string | null
  explanation: string
  violatedPolicies: string[]
  approvalRequired: boolean
  approvalReason: string | null
  trace: GuardrailTraceStep[]
  executionTimeMs: number
}

// ── Propose Node ────────────────────────────────────────────────────────

export interface ProposeNodeRequest {
  nodeType: 'FACT' | 'DECISION'
  title: string
  content: string
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'
  workspaceId: string
  departmentId?: string | null
  complianceTags?: string[]
  sourceReferences?: SourceReference[]
  relationshipRequests?: RelationshipRequest[]
  purpose?: string
  idempotencyKey?: string
}

export interface SourceReference {
  sourceNodeId?: string
  sourceDocumentId?: string
  sourcePipelineRunId?: string
  sourceAgentExecutionId?: string
  sourceMcpSessionId?: string
  sourceExternalReference?: string
  description?: string
}

export interface RelationshipRequest {
  targetNodeId: string
  relationshipType: 'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS'
  weight?: number
}

export type ProposalDecision =
  'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' | 'DUPLICATE' | 'FAILED'

export interface ProposeNodeResult {
  proposalId: string
  decision: ProposalDecision
  status: string
  nodeId: string | null
  approvalRequired: boolean
  reasonCode: string | null
  validationTrace: ValidationTraceStep[]
  runId: string | null
  executionTimeMs: number
}

export interface ValidationTraceStep {
  step: string
  passed: boolean
  message?: string
}

// ── Pipeline Run ────────────────────────────────────────────────────────

export interface PipelineRunDetail {
  runId: string
  status: string
  pipelineVersion: string
  mode: string
  strategy: string
  evaluatedAt: string
  createdAt: string
  stageSummary: StageSummary[]
  metrics: {
    totalDurationMs: number | null
    reachableNodes: number | null
    includedCandidates: number | null
    tokensUsed: number
  } | null
  error: { code: string; message: string } | null
}

export interface StageSummary {
  stageName: string
  status: string
  durationMs: number | null
  outputCount: number | null
}

// ── Subgraph ────────────────────────────────────────────────────────────

export interface SubgraphNode {
  id: string
  title: string
  type: string
  distance: number
}

export interface SubgraphEdge {
  source: string
  target: string
  relationship: string
}

export interface SubgraphResult {
  entryNodeId: string
  nodes: SubgraphNode[]
  edges: SubgraphEdge[]
  metadata: {
    nodeCount: number
    edgeCount: number
    maxDepth: number
    filteredNodes: number
  }
}

// ── SSE Events ──────────────────────────────────────────────────────────

export interface PlaygroundEvent {
  eventId: string
  eventType: string
  eventVersion: number
  organizationId: string
  aggregateType: string
  aggregateId: string
  actorId: string | null
  source: string
  correlationId: string | null
  timestamp: string
  payload: Record<string, unknown>
  classification: string
}

// ── Activity Feed ───────────────────────────────────────────────────────

export type ActivityEntryType = 'tool_call' | 'proposal' | 'event' | 'action_check'

export interface ActivityEntry {
  id: string
  type: ActivityEntryType
  toolName: string
  status: string
  detail: string
  durationMs: number | null
  timestamp: string
  runId?: string
}

// ── Replay ──────────────────────────────────────────────────────────────

export interface ReplayResult {
  originalRunId: string
  replayRunId: string
  status: string
  // Comparison fields would come from the backend
  metrics: {
    originalDurationMs: number
    replayDurationMs: number
    candidateDelta: number
  }
}
