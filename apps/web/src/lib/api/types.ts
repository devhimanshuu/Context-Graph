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
// Organizations
// ---------------------------------------------------------------------------

export type Industry =
  | 'HEALTHCARE'
  | 'FINANCE'
  | 'LEGAL'
  | 'TECHNOLOGY'
  | 'EDUCATION'
  | 'MANUFACTURING'
  | 'RETAIL'
  | 'GOVERNMENT'
  | 'OTHER'

export interface OrganizationRecord {
  id: string
  name: string
  slug: string
  industry: Industry
  status: 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  configuration?: Record<string, unknown>
  createdAt: string
  updatedAt: string
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

/** Payload accepted by `POST /workspaces/:workspaceId/nodes` (mirrors the API's Zod schema). */
export interface CreateKnowledgeNodeInput {
  title: string
  content: string
  type: NodeType
  status?: NodeStatus
  importance?: number
  derivabilityScore?: number
  complianceTags?: ComplianceTag[]
  validFrom?: string | null
  validTo?: string | null
  departmentId?: string | null
  metadata?: Record<string, unknown>
}

export type UpdateKnowledgeNodeInput = Partial<CreateKnowledgeNodeInput>

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
// Context pipeline (Phase 7 — /pipeline/context/resolve)
// ---------------------------------------------------------------------------

export type PipelineMode = 'STANDARD' | 'DEBUG' | 'AUDIT' | 'BENCHMARK'
export type CompressionHint = 'FULL' | 'SUMMARY' | 'COMPRESSED' | 'REFERENCE_ONLY'

export interface ContextRuleVerdict {
  ruleId: string
  passed: boolean
  reasonCode: string
  reason: string
}

export interface PipelineTraceEntry {
  stageId: string
  stageName: string
  status: 'completed' | 'failed'
  outputCount: number | null
  durationMs: number
}

export interface PipelineStageResult extends PipelineTraceEntry {
  startedAt: string
  completedAt: string
  inputCount: number | null
  metadata: Record<string, unknown>
}

export interface PipelineRunMetrics {
  totalDurationMs: number
  stagesExecuted: number
  reachableNodes: number
  authorizedNodes: number
  injectedNodes: number
  ruleCandidates: number
  builtCandidates: number
  rankedCandidates: number
  includedCandidates: number
  excludedByRules: number
  excludedByBudget: number
  excludedByRank: number
  ruleEngineDurationMs: number
  stageDurationsMs: Record<string, number>
}

export interface PipelineExecutionSummary {
  requestId: string
  packageId: string
  version: string
  mode: PipelineMode
  evaluatedAt: string
  funnel: {
    reachable: number
    authorized: number
    ruleCandidates: number
    included: number
  }
  metrics: PipelineRunMetrics
  trace: PipelineTraceEntry[]
  stageResults?: PipelineStageResult[]
}

export interface PipelineCandidate {
  candidateId: string
  title: string
  content: string
  type: NodeType
  status: NodeStatus
  importance: number
  distance: number
  derivabilityScore: number | null
  complianceTags: string[]
  inclusionReason: string
  compressionHint: CompressionHint
  score: number
  rank: number
  tokens: number
}

export interface PipelineExclusion {
  nodeId: string
  included: boolean
  finalReasonCode: string | null
  failingRuleId: string | null
  excludedByBudget: boolean
  excludedByRank?: boolean
  ruleResults?: ContextRuleVerdict[]
}

export interface ContextPackage {
  packageId: string
  requestId: string
  version: string
  mode: PipelineMode
  workspaceId: string
  entryNodeId: string
  strategy: 'bfs' | 'weighted'
  evaluatedAt: string
  generatedAt: string
  tokenBudget: number
  tokensUsed: number
  truncated: boolean
  candidates: PipelineCandidate[]
  exclusions: PipelineExclusion[]
  summary: PipelineExecutionSummary
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
// Audit log
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string
  organizationId: string
  workspaceId: string | null
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
  ipAddress: string | null
  occurredAt: string
}

export interface AuditSummary {
  totalAuditEvents: number
  eventsByAction: Record<string, number>
}

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------

export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED'

export interface UserRecord extends UserResponse {
  status: UserStatus
}

export interface CreateUserInput {
  email: string
  name: string
  role: Role
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  departmentId?: string | null
}

// ---------------------------------------------------------------------------
// Departments (admin)
// ---------------------------------------------------------------------------

export interface Department {
  id: string
  organizationId: string
  parentId: string | null
  name: string
  code: string
  hierarchyLevel: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateDepartmentInput {
  name: string
  code: string
  parentId?: string | null
  hierarchyLevel?: number
}

// ---------------------------------------------------------------------------
// Analytics (admin)
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  totalAuditEvents: number
  eventsByAction: Record<string, number>
}

// ---------------------------------------------------------------------------
// Configuration (admin, read-only)
// ---------------------------------------------------------------------------

export interface EngineConfiguration {
  pipeline: Record<string, unknown>
  traversal: Record<string, unknown>
  ruleEngine: Record<string, unknown>
  permission: Record<string, unknown>
  cache: Record<string, unknown>
  metrics: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Graph debug (admin) — raw validated BFS metadata
// ---------------------------------------------------------------------------

export interface DebugTraversalNode {
  id: string
  distance: number
  order: number
  parentIds: string[]
}

export interface DebugReachabilityResult {
  entryNodeId: string
  validatedGraph: boolean
  nodeIds: string[]
  distances: Record<string, number>
  order: Record<string, number>
  nodes: DebugTraversalNode[]
  metadata: TraversalMetadata
}

// ---------------------------------------------------------------------------
// Permission profiles (admin)
// ---------------------------------------------------------------------------

export interface PermissionProfile {
  id: string
  organizationId: string
  name: string
  description: string | null
  role: Role | null
  permissionLevel: PermissionLevel
  complianceClearance: ComplianceClearance
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PipelineRunRecord {
  id: string
  organizationId: string
  workspaceId: string
  actorId: string | null
  requestId: string
  packageId: string | null
  version: string
  mode: PipelineMode
  strategy: string
  entryNodeId: string
  maxDepth: number
  tokenBudget: number
  maxCandidates: number
  evaluatedAt: string
  status: 'completed' | 'failed'
  failedStageId: string | null
  /** The validated request as received (immutable, replay source of truth). */
  request: Record<string, unknown>
  /** Ordered stage results — the persisted execution trace. */
  trace: PipelineStageResult[]
  metrics: PipelineRunMetrics | null
  candidates: PipelineCandidate[] | null
  exclusions: PipelineExclusion[] | null
  error: { code: string; message: string } | null
  tokensUsed: number
  createdAt: string
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

// ---------------------------------------------------------------------------
// Ingestion (Phase 13 — document upload & processing)
// ---------------------------------------------------------------------------

export type DocumentStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'QUEUED'
  | 'EXTRACTING'
  | 'EXTRACTED'
  | 'NORMALIZING'
  | 'NORMALIZED'
  | 'CHUNKING'
  | 'CHUNKED'
  | 'INDEXING'
  | 'INDEXED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'ARCHIVED'
  | 'STALE'

export type DocumentSourceType = 'FILE' | 'URL' | 'TEXT' | 'API'

export type DocumentVisibility = 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC'

export interface DocumentRecord {
  id: string
  organizationId: string
  workspaceId: string
  title: string
  filename: string
  contentType: string
  size: number
  checksum: string
  version: number
  status: DocumentStatus
  sourceType: DocumentSourceType
  sourceUrl?: string
  storagePath?: string
  metadata: DocumentMetadata
  processingMetadata: ProcessingMetadata
  departmentId: string | null
  tags: string[]
  visibility: DocumentVisibility
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DocumentMetadata {
  author?: string
  pageCount?: number
  wordCount?: number
  language?: string
  createdAt?: string
  modifiedAt?: string
  customMetadata?: Record<string, unknown>
}

export interface ProcessingMetadata {
  extractionDurationMs?: number
  normalizationDurationMs?: number
  chunkingDurationMs?: number
  embeddingDurationMs?: number
  indexingDurationMs?: number
  totalDurationMs?: number
  chunkCount?: number
  nodeCount?: number
  error?: string
  warnings?: string[]
}

export interface DocumentChunk {
  chunkId: string
  documentId: string
  documentVersion: number
  organizationId: string
  workspaceId: string
  content: string
  chunkIndex: number
  totalChunks: number
  startOffset: number
  endOffset: number
  section?: string
  subsection?: string
  page?: number
  contentHash: string
  metadata: ChunkMetadata
  createdAt: string
}

export interface ChunkMetadata {
  title: string
  filename: string
  contentType: string
  departmentId: string | null
  tags: string[]
  visibility: DocumentVisibility
}

export interface IngestionJob {
  jobId: string
  documentId: string
  organizationId: string
  workspaceId: string
  userId: string
  type: IngestionJobType
  status: IngestionJobStatus
  attempts: number
  maxAttempts: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
  metadata?: Record<string, unknown>
}

export type IngestionJobType =
  | 'VALIDATE'
  | 'EXTRACT'
  | 'NORMALIZE'
  | 'CHUNK'
  | 'METADATA'
  | 'KNOWLEDGE'
  | 'GRAPH'
  | 'EMBED'
  | 'INDEX'
  | 'PUBLISH'
  | 'REPROCESS'

export type IngestionJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING'

// ---------------------------------------------------------------------------
// Evaluation (Phase 14)
// ---------------------------------------------------------------------------

export type EvaluationRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface EvaluationMetrics {
  retrieval: {
    precisionAt5: number
    precisionAt10: number
    recallAt5: number
    recallAt10: number
    mrr: number
    ndcgAt5: number
    hitRateAt5: number
  }
  citation: {
    citationPrecision: number
    citationRecall: number
    citationCorrectness: number
    validCitations: number
    invalidCitations: number
    hallucinatedCitations: number
  }
  answer: {
    relevanceScore: number
    groundednessScore: number
    hallucinationRate: number
  }
  security: {
    authorizationViolations: number
    tenantIsolationViolations: number
    promptInjectionSuccessRate: number
    totalSecurityTests: number
    passedSecurityTests: number
  }
  latency: {
    averageTotalLatencyMs: number
    p95LatencyMs: number
  }
  cost: {
    totalCostUsd: number
    averageCostPerQuery: number
    totalTokens: number
  }
}

export interface EvaluationExperiment {
  experimentId: string
  name: string
  description: string
  datasetVersion: string
  retrievalVersion: string
  pipelineVersion: string
  embeddingVersion: string
  model: string
  provider: string
  configuration: Record<string, unknown>
  createdAt: string
}

export interface EvaluationDataset {
  datasetId: string
  name: string
  version: string
  description: string
  metadata: {
    author: string
    tags: string[]
    totalCases: number
    category: string
  }
  createdAt: string
}

export interface EvaluationRun {
  runId: string
  experimentId: string
  status: EvaluationRunStatus
  startedAt: string
  completedAt?: string
  totalCases: number
  passedCases: number
  failedCases: number
  metrics: EvaluationMetrics | null
  errors: { caseId: string; error: string }[]
}

export interface EvaluationBaseline {
  baselineId: string
  name: string
  version: string
  metrics: EvaluationMetrics | null
  createdAt: string
}

export interface QualityGateResult {
  passed: boolean
  gates: {
    gateName: string
    metric: string
    expected: number
    actual: number
    passed: boolean
    severity: string
  }[]
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// AI Chat (Phase 14 AI layer)
// ---------------------------------------------------------------------------

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface AiChatRequest {
  userQuery: string
  entryNodeId: string
  workspaceId: string
  conversationId?: string
  conversationHistory?: AiChatMessage[]
  configuration?: Record<string, unknown>
}

export interface AiCitation {
  nodeId: string
  nodeTitle: string
  score: number
  claim: string
  excerpt: string
}

export interface AiResponse {
  answer: string
  citations: AiCitation[]
  contextSize: number
  tokensUsed: number
  model: string
  provider: string
  latencyMs: number
  conversationId: string
}

// ---------------------------------------------------------------------------
// AI Streaming
// ---------------------------------------------------------------------------

export interface AiStreamChunk {
  type: 'chunk'
  delta: string
  index: number
}

export interface AiStreamDone {
  type: 'done'
  result: AiResponse
}

export interface AiStreamError {
  type: 'error'
  error: string
}

export type AiStreamEvent = AiStreamChunk | AiStreamDone | AiStreamError

// ---------------------------------------------------------------------------
// Retrieval (Phase 12 — hybrid search)
// ---------------------------------------------------------------------------

export type RetrievalMode = 'GRAPH' | 'SEMANTIC' | 'LEXICAL' | 'HYBRID'

export interface RetrievalCandidate {
  nodeId: string
  title: string
  content: string
  score: number
  rank: number
  source: 'graph' | 'semantic' | 'lexical'
  graphScore?: number
  semanticScore?: number
  lexicalScore?: number
  metadata: Record<string, unknown>
}

export interface RetrievalMetrics {
  totalCandidates: number
  finalCandidates: number
  graphCandidates: number
  semanticCandidates: number
  lexicalCandidates: number
  retrievalTimeMs: number
  fusionTimeMs: number
  totalTimeMs: number
}

export interface RetrievalResult {
  query: string
  mode: RetrievalMode
  candidates: RetrievalCandidate[]
  metrics: RetrievalMetrics
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface WorkspaceSettings {
  workspaceId: string
  name: string
  configuration: Record<string, unknown>
}
