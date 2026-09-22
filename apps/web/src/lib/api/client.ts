'use client'

import type {
  AgentAnalytics,
  AgentCapabilityRecord,
  AgentCredentialRecord,
  AgentExecutionResponse,
  AgentIdentityRecord,
  AgentListResponse,
  ApprovalOverview,
  AiResponse,
  AiStreamEvent,
  ConversationDetail,
  ConversationSummary,
  AnalyticsSummary,
  ApiResponse,
  AuditLogEntry,
  AuditSummary,
  AuthorizationContext,
  AuthorizationDecision,
  ContextRule,
  ContextPackage,
  CreatedCredentialResponse,
  CreateDepartmentInput,
  CreateKnowledgeNodeInput,
  CreateUserInput,
  DebugReachabilityResult,
  DemoBootstrap,
  Department,
  DocumentChunk,
  DocumentRecord,
  EngineConfiguration,
  EvaluationBaseline,
  EvaluationDataset,
  EvaluationExperiment,
  EvaluationRun,
  EventRecord,
  GovernanceOverview,
  GovernancePolicyRecord,
  GuardrailActionRecord,
  GuardrailDecision,
  GuardrailsOverview,
  GraphEdge,
  KnowledgeNode,
  LoginResponse,
  OrganizationRecord,
  PermissionProfile,
  PipelineMode,
  PipelineRunRecord,
  ProposalApprovalRecord,
  ProposalOverview,
  ProposalRecord,
  ReachabilityResult,
  RetrievalResult,
  RuleEngineDefinition,
  RuleRunResponse,
  UpdateKnowledgeNodeInput,
  UserRecord,
} from './types'
import type {
  ResolveContextResult,
  CheckActionResult,
  ProposeNodeResult,
  SubgraphResult,
  PipelineRunDetail,
  ReplayResult,
  McpToolInfo,
  McpSessionInfo,
} from './playground-types'

/* NestJS API base (`/api/v1`); override via NEXT_PUBLIC_API_URL. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

const TOKEN_STORAGE_KEY = 'contextgraph.api.token'

/** Error thrown for non-2xx or envelope `success:false` responses. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: unknown,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Returns the stored JWT, or null when not authenticated to the API. */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * Thin typed client for the ContextGraph NestJS API. Handles the platform
 * envelope (`{ success, data }` / `{ success: false, error }`), bearer
 * authentication, and typed endpoints for every implemented engine.
 */
export class ApiClient {
  private token: string | null

  constructor(
    private readonly baseUrl: string = API_BASE_URL,
    token: string | null = null,
  ) {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  setToken(token: string | null): void {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token === null) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      } else {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
      }
    }
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token !== null) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    })

    const body = (await response.json()) as ApiResponse<T>
    if (!response.ok || !body.success) {
      const error = body as Extract<ApiResponse<T>, { success: false }>
      throw new ApiError(
        error.error?.message ?? `Request failed (${response.status})`,
        error.error?.code ?? 'ERR_UNKNOWN',
        error.error?.details,
        response.status,
      )
    }
    return body.data
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  /** DELETE that tolerates 204 No Content responses (no body to parse). */
  async del(path: string): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token !== null) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      let message = `Request failed (${response.status})`
      let code = 'ERR_UNKNOWN'
      if (text.length > 0) {
        try {
          const parsed = JSON.parse(text) as Extract<ApiResponse<unknown>, { success: false }>
          message = parsed.error?.message ?? message
          code = parsed.error?.code ?? code
        } catch {
          // Non-JSON error body — keep defaults.
        }
      }
      throw new ApiError(message, code, undefined, response.status)
    }
  }

  // -- Demo bootstrap (public) ------------------------------------------------
  bootstrap(): Promise<DemoBootstrap> {
    return this.get<DemoBootstrap>('/demo/bootstrap')
  }

  /** Load the starter knowledge set into a workspace (idempotent). */
  loadStarterKnowledge(workspaceId: string): Promise<{ created: number }> {
    return this.post<{ created: number }>('/demo/starter-knowledge', { workspaceId })
  }

  // -- Auth -------------------------------------------------------------------
  login(organizationId: string, email: string, password: string): Promise<LoginResponse> {
    return this.post<LoginResponse>('/auth/login', { organizationId, email, password })
  }

  // -- Authorization (Phase 5) -------------------------------------------------
  authorizationContext(): Promise<AuthorizationContext> {
    return this.get<AuthorizationContext>('/authorization/me')
  }

  evaluateResource(input: Record<string, unknown>): Promise<AuthorizationDecision> {
    return this.post<AuthorizationDecision>('/authorization/evaluate', input)
  }

  // -- Knowledge ---------------------------------------------------------------
  knowledgeNodes(workspaceId: string): Promise<KnowledgeNode[]> {
    return this.get<KnowledgeNode[]>(`/workspaces/${workspaceId}/nodes`)
  }

  knowledgeNode(id: string): Promise<KnowledgeNode> {
    return this.get<KnowledgeNode>(`/nodes/${id}`)
  }

  createKnowledgeNode(
    workspaceId: string,
    input: CreateKnowledgeNodeInput,
  ): Promise<KnowledgeNode> {
    return this.post<KnowledgeNode>(`/workspaces/${workspaceId}/nodes`, input)
  }

  updateKnowledgeNode(id: string, input: UpdateKnowledgeNodeInput): Promise<KnowledgeNode> {
    return this.request<KnowledgeNode>(`/nodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  /** Soft-delete (ADMIN/QUALITY). */
  deleteKnowledgeNode(id: string): Promise<void> {
    return this.request<void>(`/nodes/${id}`, { method: 'DELETE' })
  }

  // -- Organizations -------------------------------------------------------------
  currentOrganization(): Promise<OrganizationRecord> {
    return this.get<OrganizationRecord>('/organizations/current')
  }

  // -- Graph (Phase 4) ----------------------------------------------------------
  graphEdges(workspaceId: string): Promise<GraphEdge[]> {
    return this.get<GraphEdge[]>(`/workspaces/${workspaceId}/edges`)
  }

  reachability(
    workspaceId: string,
    body: { entryNodeId: string; maxDepth: number; strategy?: 'bfs' | 'weighted' },
  ): Promise<ReachabilityResult> {
    return this.post<ReachabilityResult>(`/workspaces/${workspaceId}/reachability`, body)
  }

  // -- Rule engine (Phase 6) -----------------------------------------------------
  ruleEngineDefinition(): Promise<RuleEngineDefinition> {
    return this.get<RuleEngineDefinition>('/rule-engine/definition')
  }

  ruleEngineRun(
    workspaceId: string,
    body: { nodeIds: string[]; entryNodeIds?: string[] },
  ): Promise<RuleRunResponse> {
    return this.post<RuleRunResponse>('/rule-engine/run', { workspaceId, ...body })
  }

  // -- Context pipeline (Phase 7 — /pipeline/context/resolve) ----------------------
  resolveContext(
    workspaceId: string,
    body: {
      entryNodeId: string
      maxDepth: number
      strategy?: 'bfs' | 'weighted'
      tokenBudget: number
      maxCandidates?: number
      mode?: PipelineMode
    },
  ): Promise<ContextPackage> {
    return this.post<ContextPackage>('/pipeline/context/resolve', { workspaceId, ...body })
  }

  // -- Rules storage -------------------------------------------------------------
  workspaceRules(workspaceId: string): Promise<ContextRule[]> {
    return this.get<ContextRule[]>(`/workspaces/${workspaceId}/rules`)
  }

  // -- Audit log (ADMIN/AUDITOR) ---------------------------------------------------
  auditEntries(query: {
    entityType?: string
    entityId?: string
    page?: number
    limit?: number
  }): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams()
    if (query.entityType !== undefined) params.set('entityType', query.entityType)
    if (query.entityId !== undefined) params.set('entityId', query.entityId)
    if (query.page !== undefined) params.set('page', String(query.page))
    if (query.limit !== undefined) params.set('limit', String(query.limit))
    return this.get<AuditLogEntry[]>(`/audit?${params.toString()}`)
  }

  auditSummary(): Promise<AuditSummary> {
    return this.get<AuditSummary>('/audit/summary')
  }

  // -- Users (ADMIN/HOD) -------------------------------------------------------------
  users(): Promise<UserRecord[]> {
    return this.get<UserRecord[]>('/users?page=1&limit=100')
  }

  createUser(input: CreateUserInput): Promise<UserRecord> {
    return this.post<UserRecord>('/users', input)
  }

  updateUser(id: string, input: Partial<CreateUserInput>): Promise<UserRecord> {
    return this.request<UserRecord>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  deleteUser(id: string): Promise<void> {
    return this.request<void>(`/users/${id}`, { method: 'DELETE' })
  }

  // -- Departments (ADMIN/HOD) ----------------------------------------------------------
  departments(organizationId: string): Promise<Department[]> {
    return this.get<Department[]>(`/organizations/${organizationId}/departments`)
  }

  createDepartment(organizationId: string, input: CreateDepartmentInput): Promise<Department> {
    return this.post<Department>(`/organizations/${organizationId}/departments`, input)
  }

  updateDepartment(id: string, input: Partial<CreateDepartmentInput>): Promise<Department> {
    return this.request<Department>(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  deleteDepartment(id: string): Promise<void> {
    return this.request<void>(`/departments/${id}`, { method: 'DELETE' })
  }

  // -- Analytics (ADMIN/AUDITOR) ----------------------------------------------------------
  analyticsSummary(): Promise<AnalyticsSummary> {
    return this.get<AnalyticsSummary>('/analytics/summary')
  }

  // -- Configuration (ADMIN, read-only) -----------------------------------------------------
  engineConfiguration(): Promise<EngineConfiguration> {
    return this.get<EngineConfiguration>('/configuration')
  }

  // -- Permission profiles --------------------------------------------------------------------
  permissionProfiles(): Promise<PermissionProfile[]> {
    return this.get<PermissionProfile[]>('/permissions/profiles')
  }

  createPermissionProfile(input: {
    name: string
    description?: string
    role?: string | null
    permissionLevel?: string
    complianceClearance?: string
  }): Promise<PermissionProfile> {
    return this.post<PermissionProfile>('/permissions/profiles', input)
  }

  assignPermissionProfile(userId: string, profileId: string): Promise<{ assigned: boolean }> {
    return this.post<{ assigned: boolean }>('/permissions/assign', { userId, profileId })
  }

  // -- Pipeline runs (event store) -------------------------------------------------------------------
  pipelineRuns(workspaceId: string, limit = 10): Promise<PipelineRunRecord[]> {
    return this.get<PipelineRunRecord[]>(
      `/pipeline/runs?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}`,
    )
  }

  pipelineRun(requestId: string): Promise<PipelineRunRecord> {
    return this.get<PipelineRunRecord>(`/pipeline/runs/${requestId}`)
  }

  replayPipelineRun(requestId: string): Promise<ContextPackage> {
    return this.post<ContextPackage>(`/pipeline/runs/${requestId}/replay`)
  }

  // -- Graph debug (ADMIN only) -----------------------------------------------------------------------
  debugReachability(
    workspaceId: string,
    body: { entryNodeId: string; maxDepth: number; strategy?: 'bfs' | 'weighted' },
  ): Promise<DebugReachabilityResult> {
    return this.post<DebugReachabilityResult>(`/debug/workspaces/${workspaceId}/reachability`, body)
  }

  // -- Ingestion (Phase 13) -----------------------------------------------------------------------
  documents(workspaceId: string): Promise<DocumentRecord[]> {
    return this.get<DocumentRecord[]>(
      `/ingestion/documents?workspaceId=${encodeURIComponent(workspaceId)}`,
    )
  }

  document(documentId: string): Promise<DocumentRecord> {
    return this.get<DocumentRecord>(`/ingestion/documents/${documentId}`)
  }

  documentStatus(documentId: string): Promise<string> {
    return this.get<string>(`/ingestion/documents/${documentId}/status`)
  }

  uploadDocument(input: {
    filename: string
    content: string
    contentType: string
    workspaceId: string
    departmentId?: string
    tags?: string[]
    visibility?: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC'
  }): Promise<DocumentRecord> {
    return this.post<DocumentRecord>('/ingestion/documents', input)
  }

  reprocessDocument(documentId: string): Promise<DocumentRecord> {
    return this.post<DocumentRecord>(`/ingestion/documents/${documentId}/reprocess`)
  }

  archiveDocument(documentId: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/ingestion/documents/${documentId}/archive`)
  }

  deleteDocument(documentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/ingestion/documents/${documentId}`, {
      method: 'DELETE',
    })
  }

  documentChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.get<DocumentChunk[]>(`/ingestion/documents/${documentId}/chunks`)
  }

  // -- Evaluation (Phase 14) --------------------------------------------------
  evaluationExperiments(): Promise<EvaluationExperiment[]> {
    return this.get<EvaluationExperiment[]>('/evaluations/experiments')
  }

  evaluationDatasets(): Promise<EvaluationDataset[]> {
    return this.get<EvaluationDataset[]>('/evaluations/datasets')
  }

  evaluationRuns(experimentId?: string): Promise<EvaluationRun[]> {
    const params =
      experimentId !== undefined ? `?experimentId=${encodeURIComponent(experimentId)}` : ''
    return this.get<EvaluationRun[]>(`/evaluations/runs${params}`)
  }

  evaluationRun(runId: string): Promise<EvaluationRun> {
    return this.get<EvaluationRun>(`/evaluations/runs/${runId}`)
  }

  startEvaluationRun(experimentId: string, datasetId: string): Promise<EvaluationRun> {
    return this.post<EvaluationRun>('/evaluations/runs', { experimentId, datasetId })
  }

  cancelEvaluationRun(runId: string): Promise<void> {
    return this.post<void>(`/evaluations/runs/${runId}/cancel`)
  }

  evaluationBaselines(): Promise<EvaluationBaseline[]> {
    return this.get<EvaluationBaseline[]>('/evaluations/baselines')
  }

  // -- AI Chat ----------------------------------------------------------------
  aiChat(request: {
    userQuery: string
    entryNodeId: string
    workspaceId: string
    conversationId?: string
    conversationHistory?: { role: string; content: string; timestamp?: string }[]
  }): Promise<AiResponse> {
    return this.post<AiResponse>('/ai/chat', request)
  }

  /**
   * Stream AI chat response via SSE (POST). Returns an async generator that
   * yields parsed AiStreamEvent objects. The caller should iterate this
   * generator and accumulate the delta tokens for real-time rendering.
   *
   * Usage:
   *   for await (const event of client.aiChatStream(request)) {
   *     if (event.type === 'chunk') appendText(event.delta)
   *     if (event.type === 'done') setCitations(event.result.citations)
   *   }
   */
  async *aiChatStream(request: {
    userQuery: string
    entryNodeId: string
    workspaceId: string
    conversationId?: string
    conversationHistory?: { role: string; content: string; timestamp?: string }[]
  }): AsyncGenerator<AiStreamEvent> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.token !== null) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}/ai/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const body = (await response.json()) as ApiResponse<AiResponse>
      if (!body.success) {
        throw new ApiError(
          (body as Extract<ApiResponse<AiResponse>, { success: false }>).error?.message ??
            `Request failed (${response.status})`,
          (body as Extract<ApiResponse<AiResponse>, { success: false }>).error?.code ??
            'ERR_UNKNOWN',
          undefined,
          response.status,
        )
      }
      throw new ApiError(
        `Request failed (${response.status})`,
        'ERR_UNKNOWN',
        undefined,
        response.status,
      )
    }

    const reader = response.body?.getReader()
    if (reader === undefined || reader === null) {
      throw new ApiError('Response body is not readable', 'ERR_STREAM')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines from the buffer
        const lines = buffer.split('\n')
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed === '' || trimmed.startsWith(':')) continue
          if (!trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6) // Remove 'data: ' prefix
          try {
            const event = JSON.parse(jsonStr) as AiStreamEvent
            yield event
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6)) as AiStreamEvent
          yield event
        } catch {
          // Skip
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // -- Conversations (persisted chat history) ----------------------------------
  conversations(limit = 50): Promise<ConversationSummary[]> {
    return this.get<ConversationSummary[]>(`/conversations?limit=${limit}`)
  }

  conversation(id: string): Promise<ConversationDetail> {
    return this.get<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`)
  }

  renameConversation(id: string, title: string): Promise<void> {
    return this.patch<void>(`/conversations/${encodeURIComponent(id)}`, { title })
  }

  deleteConversation(id: string): Promise<void> {
    return this.del(`/conversations/${encodeURIComponent(id)}`)
  }

  // -- Retrieval (hybrid search) ----------------------------------------------
  retrievalSearch(body: {
    userQuery: string
    workspaceId?: string
    entryNodeId?: string
    mode?: string
    topK?: number
    enableGraph?: boolean
    enableSemantic?: boolean
    enableLexical?: boolean
  }): Promise<RetrievalResult> {
    return this.post<RetrievalResult>('/retrieval/search', body)
  }

  // -- Agent Playground (MCP tool wrappers) -------------------------------------

  /** MCP resolve_context — returns governed context package. */
  playgroundResolveContext(body: {
    query: string
    workspaceId: string
    entryNodeId?: string
    topK?: number
    maxCandidates?: number
    retrievalMode?: string
    tokenBudget?: number
    executionMode?: string
  }): Promise<ResolveContextResult> {
    return this.post<ResolveContextResult>('/mcp/tools/resolve-context', body)
  }

  /** MCP check_action — evaluate action authorization. */
  playgroundCheckAction(body: {
    action: string
    targetType: string
    targetId?: string
    parameters?: Record<string, unknown>
    purpose?: string
  }): Promise<CheckActionResult> {
    return this.post<CheckActionResult>('/mcp/tools/check-action', body)
  }

  /** MCP propose_node — propose governed knowledge. */
  playgroundProposeNode(body: {
    nodeType: string
    title: string
    content: string
    classification: string
    workspaceId: string
    departmentId?: string | null
    complianceTags?: string[]
    sourceReferences?: unknown[]
    relationshipRequests?: unknown[]
    purpose?: string
    idempotencyKey?: string
  }): Promise<ProposeNodeResult> {
    return this.post<ProposeNodeResult>('/mcp/tools/propose-node', body)
  }

  /** MCP get_subgraph — inspect authorized graph portion. */
  playgroundGetSubgraph(body: {
    nodeId: string
    workspaceId: string
    maxDepth?: number
    direction?: string
    includeMetadata?: boolean
  }): Promise<SubgraphResult> {
    return this.post<SubgraphResult>('/mcp/tools/get-subgraph', body)
  }

  /** MCP get_run — inspect a pipeline run. */
  playgroundGetRun(runId: string): Promise<PipelineRunDetail> {
    return this.get<PipelineRunDetail>(`/mcp/tools/get-run/${encodeURIComponent(runId)}`)
  }

  /** MCP replay_run — replay a pipeline execution. */
  playgroundReplayRun(runId: string): Promise<ReplayResult> {
    return this.post<ReplayResult>(`/mcp/tools/replay-run/${encodeURIComponent(runId)}`)
  }

  /** MCP tool list — discover available MCP tools. */
  playgroundTools(): Promise<McpToolInfo[]> {
    return this.get<McpToolInfo[]>('/mcp/tools')
  }

  /** MCP session info — current authenticated identity. */
  playgroundSession(): Promise<McpSessionInfo> {
    return this.get<McpSessionInfo>('/mcp/session')
  }

  // -- Agent orchestration -------------------------------------------------------------------

  /** List the current user's agent executions. */
  agentExecutions(): Promise<AgentListResponse> {
    return this.get<AgentListResponse>('/agents/executions')
  }

  /** Aggregate agent analytics for the current organization. */
  agentAnalytics(): Promise<AgentAnalytics> {
    return this.get<AgentAnalytics>('/agents/analytics')
  }

  /** Run an agent execution. */
  runAgent(input: {
    userRequest: string
    workspaceId: string
    entryContext?: string[]
  }): Promise<AgentExecutionResponse> {
    return this.post<AgentExecutionResponse>('/agents/run', input)
  }

  /** List registered agent identities. */
  agentIdentities(query?: {
    status?: string
    environment?: string
  }): Promise<AgentIdentityRecord[]> {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.environment) params.set('environment', query.environment)
    const qs = params.toString()
    return this.get<AgentIdentityRecord[]>(`/agents${qs ? `?${qs}` : ''}`)
  }

  /** Create an agent identity. */
  createAgentIdentity(input: {
    organizationId: string
    name: string
    slug: string
    description?: string
    purpose?: string
    environment: string
    ownerUserId?: string
  }): Promise<AgentIdentityRecord> {
    return this.post<AgentIdentityRecord>('/agents', input)
  }

  /** Get one agent identity (tenant-checked). */
  agentIdentityDetail(id: string): Promise<AgentIdentityRecord> {
    return this.get<AgentIdentityRecord>(`/agents/${id}`)
  }

  /** Update an agent identity. */
  updateAgentIdentity(
    id: string,
    input: { name?: string; description?: string; purpose?: string; ownerUserId?: string },
  ): Promise<AgentIdentityRecord> {
    return this.patch<AgentIdentityRecord>(`/agents/${id}`, input)
  }

  agentIdentitySuspend(id: string): Promise<AgentIdentityRecord> {
    return this.post<AgentIdentityRecord>(`/agents/${id}/suspend`)
  }

  agentIdentityRevoke(id: string): Promise<AgentIdentityRecord> {
    return this.post<AgentIdentityRecord>(`/agents/${id}/revoke`)
  }

  agentIdentityReactivate(id: string): Promise<AgentIdentityRecord> {
    return this.post<AgentIdentityRecord>(`/agents/${id}/reactivate`)
  }

  // -- Agent credentials & capabilities -------------------------------------------------

  agentCredentials(agentId: string): Promise<AgentCredentialRecord[]> {
    return this.get<AgentCredentialRecord[]>(`/agents/${agentId}/credentials`)
  }

  /** Create a credential. The fullKey is only ever returned here. */
  agentCreateCredential(
    agentId: string,
    input: { name: string; expiresAt?: string },
  ): Promise<CreatedCredentialResponse> {
    return this.post<CreatedCredentialResponse>(`/agents/${agentId}/credentials`, input)
  }

  agentRevokeCredential(agentId: string, credentialId: string): Promise<{ revoked: boolean }> {
    return this.post<{ revoked: boolean }>(`/agents/${agentId}/credentials/${credentialId}/revoke`)
  }

  agentRotateCredential(agentId: string, credentialId: string): Promise<CreatedCredentialResponse> {
    return this.post<CreatedCredentialResponse>(
      `/agents/${agentId}/credentials/${credentialId}/rotate`,
    )
  }

  agentCapabilities(agentId: string): Promise<AgentCapabilityRecord[]> {
    return this.get<AgentCapabilityRecord[]>(`/agents/${agentId}/capabilities`)
  }

  agentGrantCapability(
    agentId: string,
    input: { capability: string; expiresAt?: string },
  ): Promise<AgentCapabilityRecord> {
    return this.post<AgentCapabilityRecord>(`/agents/${agentId}/capabilities`, input)
  }

  agentRevokeCapability(agentId: string, capability: string): Promise<void> {
    return this.del(`/agents/${agentId}/capabilities/${encodeURIComponent(capability)}`)
  }

  // -- Governance ------------------------------------------------------------------------------

  /** Executive governance overview (users, agents, policies, costs, security). */
  governanceOverview(): Promise<GovernanceOverview> {
    return this.get<GovernanceOverview>('/governance/overview')
  }

  /** List governance policies. */
  governancePolicies(): Promise<GovernancePolicyRecord[]> {
    return this.get<GovernancePolicyRecord[]>('/governance/policies')
  }

  /** Publish a governance policy. */
  publishGovernancePolicy(policyId: string): Promise<GovernancePolicyRecord> {
    return this.post<GovernancePolicyRecord>(`/governance/policies/${policyId}/publish`)
  }

  /** Create a governance policy. */
  createGovernancePolicy(input: {
    name: string
    type: string
    configuration?: Record<string, unknown>
  }): Promise<GovernancePolicyRecord> {
    return this.post<GovernancePolicyRecord>('/governance/policies', input)
  }

  // -- Guardrails --------------------------------------------------------------------------------

  /** Guardrails overview + recent action checks. */
  /** Registered guardrail actions (API wraps the list in { actions }). */
  async guardrailsActions(): Promise<GuardrailActionRecord[]> {
    const body = await this.get<{ actions: GuardrailActionRecord[] }>('/guardrails/actions')
    return body.actions ?? []
  }

  guardrailsOverview(): Promise<GuardrailsOverview> {
    return this.get<GuardrailsOverview>('/guardrails/overview')
  }

  /** Evaluate an action against the guardrails pipeline. */
  guardrailsCheckAction(input: {
    action: string
    targetType: string
    targetId?: string
    parameters?: Record<string, unknown>
    purpose?: string
  }): Promise<GuardrailDecision> {
    return this.post<GuardrailDecision>('/guardrails/check-action', input)
  }

  // -- Events / outbox ------------------------------------------------------------------------------

  /** List domain events with optional filters. */
  events(query?: {
    eventType?: string
    aggregateType?: string
    limit?: number
    offset?: number
  }): Promise<EventRecord[]> {
    const params = new URLSearchParams()
    if (query?.eventType !== undefined) params.set('eventType', query.eventType)
    if (query?.aggregateType !== undefined) params.set('aggregateType', query.aggregateType)
    if (query?.limit !== undefined) params.set('limit', String(query.limit))
    if (query?.offset !== undefined) params.set('offset', String(query.offset))
    const qs = params.toString()
    return this.get<EventRecord[]>(qs === '' ? '/events' : `/events?${qs}`)
  }

  // -- Node proposals + writeback ---------------------------------------------------------------------

  /** Node proposal overview (counts by status). */
  proposalOverview(): Promise<ProposalOverview> {
    return this.get<ProposalOverview>('/knowledge/proposals/overview')
  }

  /** List node proposals. */
  proposals(query?: { status?: string; limit?: number }): Promise<ProposalRecord[]> {
    const params = new URLSearchParams()
    if (query?.status !== undefined) params.set('status', query.status)
    if (query?.limit !== undefined) params.set('limit', String(query.limit))
    const qs = params.toString()
    return this.get<ProposalRecord[]>(
      qs === '' ? '/knowledge/proposals' : `/knowledge/proposals?${qs}`,
    )
  }

  /** List proposal approval requests. */
  proposalApprovals(query?: {
    status?: string
    limit?: number
  }): Promise<ProposalApprovalRecord[]> {
    const params = new URLSearchParams()
    if (query?.status !== undefined) params.set('status', query.status)
    if (query?.limit !== undefined) params.set('limit', String(query.limit))
    const qs = params.toString()
    return this.get<ProposalApprovalRecord[]>(
      qs === '' ? '/proposals/approvals' : `/proposals/approvals?${qs}`,
    )
  }

  /** Resolve (approve/reject) a proposal approval request. */
  resolveProposalApproval(
    approvalId: string,
    input: { decision: 'APPROVED' | 'REJECTED'; note?: string },
  ): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/proposals/approvals/${approvalId}/resolve`, input)
  }

  /** Approval overview (pending counts, SLA breaches). */
  proposalApprovalOverview(): Promise<ApprovalOverview> {
    return this.get<ApprovalOverview>('/proposals/approvals/overview')
  }
}
