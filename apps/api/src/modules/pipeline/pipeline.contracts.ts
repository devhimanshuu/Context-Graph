import type { AuthenticatedUser, EntityId } from '@contextgraph/types'

/** Immutable stage name constants — the pipeline's stable vocabulary. */
export const PIPELINE_STAGE = {
  PERMISSION: 'permission',
  ENTRY_RESOLUTION: 'entry-resolution',
  GRAPH_TRAVERSAL: 'graph-traversal',
  ZONE_INJECTION: 'zone-injection',
  ISOLATION_FILTER: 'isolation-filter',
  COMPLIANCE_FILTER: 'compliance-filter',
  PERMISSION_FILTER: 'permission-filter',
  TEMPORAL_FILTER: 'temporal-filter',
  DERIVABILITY_FILTER: 'derivability-filter',
  CANDIDATE_BUILD: 'candidate-build',
} as const

export type PipelineStageName = (typeof PIPELINE_STAGE)[keyof typeof PIPELINE_STAGE]

/** Request-scoped state shared between stages. */
export interface PipelineContext {
  requestId: string
  user: AuthenticatedUser
  organizationId: EntityId
  workspaceId: EntityId
  entryNodeIds: EntityId[]
  /** Data bag written/read by stages in order. */
  state: Record<string, unknown>
}

/** Input of a single pipeline run. */
export interface PipelineRequest {
  workspaceId: EntityId
  context: Record<string, unknown>
  maxDepth: number
}

/** Output of a single pipeline run. */
export interface PipelineResponse {
  candidateIds: EntityId[]
  metrics: PipelineMetrics
}

export interface PipelineMetrics {
  stagesExecuted: number
  nodesVisited: number
  durationMs: number
}

/* Every pipeline stage implements this contract. Stages are order-independent */
export interface IPipelineStage {
  readonly name: PipelineStageName
  execute(context: PipelineContext): Promise<PipelineContext>
}

/** The canonical stage order enforced by the orchestrator. */
export const DEFAULT_STAGE_ORDER: readonly PipelineStageName[] = [
  PIPELINE_STAGE.PERMISSION,
  PIPELINE_STAGE.ENTRY_RESOLUTION,
  PIPELINE_STAGE.GRAPH_TRAVERSAL,
  PIPELINE_STAGE.ZONE_INJECTION,
  PIPELINE_STAGE.ISOLATION_FILTER,
  PIPELINE_STAGE.COMPLIANCE_FILTER,
  PIPELINE_STAGE.PERMISSION_FILTER,
  PIPELINE_STAGE.TEMPORAL_FILTER,
  PIPELINE_STAGE.DERIVABILITY_FILTER,
  PIPELINE_STAGE.CANDIDATE_BUILD,
] as const
