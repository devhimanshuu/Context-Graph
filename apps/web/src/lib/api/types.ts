/* Typed DTOs mirroring the NestJS API response contracts (apps/api DTOs). */

/** Platform envelope wrapping every successful API response. */
export interface ApiEnvelope<T> {
  success: true
  data: T
  requestId: string
  timestamp: string
}

/** Error envelope returned by the global exception filter. */
export interface ApiErrorEnvelope {
  success: false
  error: { code: string; message: string; details?: unknown }
  requestId?: string
  timestamp?: string
}

export type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope

// ---------------------------------------------------------------------------
// Demo bootstrap (public)
// ---------------------------------------------------------------------------

export interface DemoUser {
  id: string
  email: string
  name: string
  role: Role
  departmentName: string | null
}

export interface DemoBootstrap {
  organizationId: string
  organizationName: string
  workspaceId: string
  workspaceName: string
  users: DemoUser[]
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: UserResponse
}

export interface UserResponse {
  id: string
  organizationId: string
  departmentId: string | null
  email: string
  name: string
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  status: 'INVITED' | 'ACTIVE' | 'DISABLED'
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

export interface KnowledgeNode {
  id: string
  organizationId: string
  workspaceId: string
  departmentId: string | null
  title: string
  content: string
  type: NodeType
  status: NodeStatus
  importance: number
  derivabilityScore: number
  version: number
  validFrom: string | null
  validTo: string | null
  complianceTags: ComplianceTag[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  relationshipType: RelationshipType
  weight: number
}

export interface NodeProjection {
  id: string
  title: string
  type: string
  status: string
}

export interface TraversalNode {
  id: string
  distance: number
  order: number
  parentIds: string[]
}

export interface TraversalMetadata {
  visitedNodeCount: number
  traversalDepth: number
  edgesExamined: number
  duplicateVisitsPrevented: number
  maxQueueSize: number
  traversalDurationMs: number
  truncated: boolean
}

export interface ReachabilityResult {
  entryNodeId: string
  nodeIds: string[]
  distances: Record<string, number>
  costs?: Record<string, number>
  order: Record<string, number>
  filteredNodeCount?: number
  nodes?: NodeProjection[]
  traversal?: TraversalNode[]
  metadata?: TraversalMetadata
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export interface AuthorizationContext {
  userId: string
  organizationId: string
  departmentId: string | null
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  effectiveComplianceTags: ComplianceTag[]
  accessibleDepartmentIds: string[]
  compiledAt: string
}

export interface PolicyVerdict {
  policy: string
  outcome: 'ALLOW' | 'DENY' | 'NOT_APPLICABLE'
  reason?: string
}

export interface AuthorizationDecision {
  allowed: boolean
  reason: string
  failedPolicy: string | null
  evaluatedPolicies: string[]
  verdicts?: PolicyVerdict[]
}

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

export interface RuleEngineDefinition {
  version: number
  stages: string[]
}

// ---------------------------------------------------------------------------
// Rule engine run (Phase 6 — full funnel + per-node reasons)
// ---------------------------------------------------------------------------

export interface RuleRunNode {
  id: string
  title: string
  type: string
  status: string
}

export interface RuleRunVerdict {
  ruleId: string
  passed: boolean
  reasonCode: string
  reason: string
}

export interface RuleRunExplanation {
  nodeId: string
  included: boolean
  finalReasonCode: string | null
  failingRuleId: string | null
  ruleResults: RuleRunVerdict[]
}

export interface RuleRunStageCount {
  stageId: string
  count: number
}

export interface RuleRunMetrics {
  initialCount: number
  injectedCount: number
  finalCount: number
  totalDurationMs: number
  countsAfterStage: RuleRunStageCount[]
  removedByRule: Record<string, number>
  removedByReason: Record<string, number>
  ruleDurationsMs: Record<string, number>
}

export interface RuleRunCandidate extends RuleRunNode {
  importance: number
  complianceTags: string[]
}

export interface RuleRunResponse {
  requestId: string
  entryNodeIds: string[]
  nodes: RuleRunNode[]
  candidates: RuleRunCandidate[]
  explanations: RuleRunExplanation[]
  metrics: RuleRunMetrics
  executedStages: string[]
}

// ---------------------------------------------------------------------------
// Context assembly (Phase 7 — pipeline module)
// ---------------------------------------------------------------------------

export interface ContextRuleVerdict {
  ruleId: string
  passed: boolean
  reasonCode: string
  reason: string
}

export interface ContextNodeExplanation {
  nodeId: string
  included: boolean
  finalReasonCode: string | null
  failingRuleId: string | null
  ruleResults: ContextRuleVerdict[]
}

export interface ContextNodeSummary {
  id: string
  title: string
  type: string
  status: string
  importance: number
  distance: number
  derivabilityScore: number | null
  tokens: number
  included: boolean
  excludedByBudget: boolean
}

export interface ContextCandidate extends ContextNodeSummary {
  content: string
  complianceTags: string[]
}

export interface ContextFunnel {
  reachable: number
  candidates: number
  included: number
}

export interface ContextMetrics {
  initialCount: number
  injectedCount: number
  finalCount: number
  totalDurationMs: number
}

export interface ContextPackage {
  packageId: string
  requestId: string
  entryNodeId: string
  workspaceId: string
  strategy: 'bfs' | 'weighted'
  evaluatedAt: string
  tokenBudget: number
  tokensUsed: number
  truncated: boolean
  funnel: ContextFunnel
  nodes: ContextNodeSummary[]
  candidates: ContextCandidate[]
  explanations: ContextNodeExplanation[]
  executedStages: string[]
  metrics: ContextMetrics
}

// ---------------------------------------------------------------------------
// Rules (context rules storage)
// ---------------------------------------------------------------------------

export interface ContextRule {
  id: string
  organizationId: string
  workspaceId: string | null
  name: string
  description: string | null
  condition: Record<string, unknown>
  action: Record<string, unknown>
  priority: number
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
  isEnabled: boolean
  version: number
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Domain enums (kept in sync with @/domain/enums)
// ---------------------------------------------------------------------------

export type Role = 'ADMIN' | 'HOD' | 'EDITOR' | 'VIEWER' | 'QUALITY' | 'AUDITOR'
export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN'
export type ComplianceClearance = 'NONE' | 'STANDARD' | 'SENSITIVE' | 'RESTRICTED' | 'CRITICAL'
export type NodeType = 'FACT' | 'CONSTRAINT' | 'DECISION' | 'ANTI_PATTERN'
export type NodeStatus =
  'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'EXPIRED' | 'LEGAL_HOLD' | 'REVIEW_REQUIRED' | 'ARCHIVED'
export type RelationshipType =
  'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS'
export type ComplianceTag =
  | 'HIPAA'
  | 'GDPR'
  | 'PCI_DSS'
  | 'SOC2'
  | 'SOX'
  | 'FINRA'
  | 'ISO_27001'
  | 'PHI'
  | 'PII'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'INTERNAL'
  | 'PUBLIC'
