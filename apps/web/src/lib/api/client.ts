'use client'

import type {
  ApiResponse,
  AuthorizationContext,
  AuthorizationDecision,
  ContextRule,
  ContextPackage,
  DemoBootstrap,
  GraphEdge,
  KnowledgeNode,
  LoginResponse,
  ReachabilityResult,
  RuleEngineDefinition,
  RuleRunResponse,
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

  // -- Context assembly (Phase 7) -------------------------------------------------
  assembleContext(
    workspaceId: string,
    body: {
      entryNodeId: string
      maxDepth: number
      strategy?: 'bfs' | 'weighted'
      tokenBudget: number
    },
  ): Promise<ContextPackage> {
    return this.post<ContextPackage>('/pipeline/contexts', { workspaceId, ...body })
  }

  // -- Rules storage -------------------------------------------------------------
  workspaceRules(workspaceId: string): Promise<ContextRule[]> {
    return this.get<ContextRule[]>(`/workspaces/${workspaceId}/rules`)
  }
}
