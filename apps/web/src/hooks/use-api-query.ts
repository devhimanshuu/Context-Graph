'use client'

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useApi } from '@/components/dashboard/api-provider'
import type { ApiClient } from '@/lib/api/client'
import type {
  AnalyticsSummary,
  AuditLogEntry,
  AuditSummary,
  ContextRule,
  Department,
  DocumentRecord,
  DocumentChunk,
  EngineConfiguration,
  GraphEdge,
  KnowledgeNode,
  OrganizationRecord,
  PipelineRunRecord,
  RuleEngineDefinition,
  UserRecord,
} from '@/lib/api/types'

/**
 * TanStack Query bound to the dashboard API connection. The query key is
 * suffixed with the selected demo user id, so switching users (which changes the
 * compiled authorization context) always fetches fresh, permission-aware data
 * under a new key — the old user's data is never served to the new one.
 *
 * Before the API is `ready` the query is disabled (`data` stays `undefined`).
 */
export function useApiQuery<T>(
  queryKey: QueryKey,
  fetcher: (client: ApiClient) => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn' | 'enabled'>,
): UseQueryResult<T, Error> {
  const { status, client, selectedUser } = useApi()

  return useQuery<T, Error, T, QueryKey>({
    queryKey: [...queryKey, selectedUser?.id ?? 'anonymous'],
    queryFn: () => {
      if (client === null) {
        throw new Error('API client is not ready')
      }
      return fetcher(client)
    },
    enabled: status === 'ready' && client !== null,
    ...options,
  })
}

// ---------------------------------------------------------------------------
// Shared typed hooks — one per backend resource. Pages with bespoke fetchers
// (counts, aggregates) use `useApiQuery` directly.
// ---------------------------------------------------------------------------

export function useKnowledgeNodes(workspaceId: string | null): UseQueryResult<KnowledgeNode[]> {
  return useApiQuery(['knowledge-nodes', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? [] : api.knowledgeNodes(workspaceId),
  )
}

export function useGraphEdges(workspaceId: string | null): UseQueryResult<GraphEdge[]> {
  return useApiQuery(['graph-edges', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? [] : api.graphEdges(workspaceId),
  )
}

export function useWorkspaceRules(workspaceId: string | null): UseQueryResult<ContextRule[]> {
  return useApiQuery(['workspace-rules', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? [] : api.workspaceRules(workspaceId),
  )
}

export function usePipelineRuns(
  workspaceId: string | null,
  limit = 10,
): UseQueryResult<PipelineRunRecord[]> {
  return useApiQuery(['pipeline-runs', workspaceId ?? 'none', limit], async (api) =>
    workspaceId === null ? [] : api.pipelineRuns(workspaceId, limit),
  )
}

export function usePipelineRun(requestId: string | null): UseQueryResult<PipelineRunRecord> {
  return useApiQuery(['pipeline-run', requestId ?? 'none'], async (api) => {
    if (requestId === null) {
      throw new Error('Missing pipeline run id')
    }
    return api.pipelineRun(requestId)
  })
}

export function useDepartments(organizationId: string | null): UseQueryResult<Department[]> {
  return useApiQuery(['departments', organizationId ?? 'none'], async (api) =>
    organizationId === null ? [] : api.departments(organizationId),
  )
}

export function useUsers(): UseQueryResult<UserRecord[]> {
  return useApiQuery(['users'], async (api) => api.users())
}

export function useCurrentOrganization(): UseQueryResult<OrganizationRecord> {
  return useApiQuery(['organization-current'], async (api) => api.currentOrganization())
}

export function useAuditSummary(): UseQueryResult<AuditSummary> {
  return useApiQuery(['audit-summary'], async (api) => api.auditSummary())
}

export function useAuditEntries(query: {
  entityType?: string
  entityId?: string
  page?: number
  limit?: number
}): UseQueryResult<AuditLogEntry[]> {
  return useApiQuery(['audit-entries', query.entityType ?? '', query.limit ?? 50], async (api) =>
    api.auditEntries(query),
  )
}

export function useAnalyticsSummary(): UseQueryResult<AnalyticsSummary> {
  return useApiQuery(['analytics-summary'], async (api) => api.analyticsSummary())
}

export function useEngineConfiguration(): UseQueryResult<EngineConfiguration> {
  return useApiQuery(['engine-configuration'], async (api) => api.engineConfiguration())
}

export function useRuleEngineDefinition(): UseQueryResult<RuleEngineDefinition> {
  return useApiQuery(['rule-engine-definition'], async (api) => api.ruleEngineDefinition())
}

// ---------------------------------------------------------------------------
// Ingestion hooks
// ---------------------------------------------------------------------------

export function useDocuments(workspaceId: string | null): UseQueryResult<DocumentRecord[]> {
  return useApiQuery(['documents', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? [] : api.documents(workspaceId),
  )
}

export function useDocument(documentId: string | null): UseQueryResult<DocumentRecord> {
  return useApiQuery(['document', documentId ?? 'none'], async (api) => {
    if (documentId === null) {
      throw new Error('Missing document id')
    }
    return api.document(documentId)
  })
}

export function useDocumentChunks(documentId: string | null): UseQueryResult<DocumentChunk[]> {
  return useApiQuery(['document-chunks', documentId ?? 'none'], async (api) => {
    if (documentId === null) {
      return []
    }
    return api.documentChunks(documentId)
  })
}
