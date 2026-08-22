'use client'

import type {
  AiResponse,
  AiStreamEvent,
  AnalyticsSummary,
  ApiResponse,
  AuditLogEntry,
  AuditSummary,
  AuthorizationContext,
  AuthorizationDecision,
  ContextRule,
  ContextPackage,
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
  GraphEdge,
  KnowledgeNode,
  LoginResponse,
  OrganizationRecord,
  PermissionProfile,
  PipelineMode,
  PipelineRunRecord,
  ReachabilityResult,
  RetrievalResult,
  RuleEngineDefinition,
  RuleRunResponse,
  UpdateKnowledgeNodeInput,
  UserRecord,
} from './types'

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

  // -- Demo bootstrap (public) ------------------------------------------------
  bootstrap(): Promise<DemoBootstrap> {
    return this.get<DemoBootstrap>('/demo/bootstrap')
  }

  // -- Auth -------------------------------------------------------------------
  login(organizationId: string, email: string): Promise<LoginResponse> {
    return this.post<LoginResponse>('/auth/login', { organizationId, email })
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
    return this.get<EvaluationExperiment[]>('/api/v1/evaluations/experiments')
  }

  evaluationDatasets(): Promise<EvaluationDataset[]> {
    return this.get<EvaluationDataset[]>('/api/v1/evaluations/datasets')
  }

  evaluationRuns(experimentId?: string): Promise<EvaluationRun[]> {
    const params =
      experimentId !== undefined ? `?experimentId=${encodeURIComponent(experimentId)}` : ''
    return this.get<EvaluationRun[]>(`/api/v1/evaluations/runs${params}`)
  }

  evaluationRun(runId: string): Promise<EvaluationRun> {
    return this.get<EvaluationRun>(`/api/v1/evaluations/runs/${runId}`)
  }

  startEvaluationRun(experimentId: string, datasetId: string): Promise<EvaluationRun> {
    return this.post<EvaluationRun>('/api/v1/evaluations/runs', { experimentId, datasetId })
  }

  cancelEvaluationRun(runId: string): Promise<void> {
    return this.post<void>(`/api/v1/evaluations/runs/${runId}/cancel`)
  }

  evaluationBaselines(): Promise<EvaluationBaseline[]> {
    return this.get<EvaluationBaseline[]>('/api/v1/evaluations/baselines')
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
    return this.post<RetrievalResult>('/api/v1/retrieval/search', body)
  }
}
