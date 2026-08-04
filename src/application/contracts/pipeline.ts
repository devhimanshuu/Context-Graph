import { type CandidateNodeDto } from '@/application/dto/candidate-node.dto'
import { type MetricsContextDto } from '@/application/dto/metrics-context.dto'
import { type NodeContextDto } from '@/application/dto/node-context.dto'
import { type UserContextDto } from '@/application/dto/user-context.dto'
import { type BaseApplicationError } from '@/application/errors'

/**
 * Pipeline contracts — the shared vocabulary of the pipeline machinery.
 *
 * Layering note: contracts may depend on application DTOs (the data flowing
 * through the pipeline) and on application errors, but never on
 * implementations, the ORM, or the HTTP layer.
 */

/** The ordered stage kinds a pipeline run executes. */
export type PipelineStageKind =
  | 'PERMISSION'
  | 'ENTRY_RESOLVER'
  | 'GRAPH_TRAVERSAL'
  | 'ZONE_INJECTION'
  | 'ISOLATION_FILTER'
  | 'COMPLIANCE_FILTER'
  | 'PERMISSION_FILTER'
  | 'TEMPORAL_FILTER'
  | 'DERIVABILITY_FILTER'
  | 'CANDIDATE_BUILDER'

/** Static metadata describing a pipeline stage (registry entry, not an instance). */
export interface PipelineStageDefinition {
  kind: PipelineStageKind
  description: string
  /** Lower numbers execute first. */
  order: number
}

/** Input contract for a pipeline run. */
export interface PipelineRequest {
  requestId: string
  organizationId: string
  workspaceId: string
  /** Optional: skip entry resolution and start traversal from these nodes. */
  entryNodeIds?: string[]
  maxDepth: number
  maxCandidates: number
  user: UserContextDto
  metadata: Record<string, unknown>
}

/** Output contract of a pipeline run. */
export interface PipelineResponse {
  requestId: string
  candidates: CandidateNodeDto[]
  summary: PipelineExecutionSummary
}

/**
 * The mutable runtime bag carried through the pipeline. Stages read prior
 * results and accumulate into it; the orchestrator owns the lifecycle.
 */
export interface PipelineContext {
  request: PipelineRequest
  currentStage: PipelineStageKind | null
  visitedNodes: NodeContextDto[]
  /** Node ids excluded by permission filtering (retained for audit/UX). */
  deniedNodeIds: string[]
  stageResults: PipelineStageResult[]
  metrics: PipelineMetrics
  metadata: Record<string, unknown>
}

/** Outcome of a single stage execution. */
export interface PipelineStageResult {
  stage: PipelineStageKind
  status: 'completed' | 'skipped' | 'failed'
  startedAt: Date
  finishedAt: Date | null
  durationMs: number | null
  /** Stage-specific output summary (nodes filtered, edges traversed, ...). */
  output: Record<string, unknown>
}

/** Timing and cardinality metrics of a run — canonical shape is `MetricsContextDto`. */
export type PipelineMetrics = MetricsContextDto

/** Human + machine readable summary of an entire run. */
export interface PipelineExecutionSummary {
  requestId: string
  status: 'completed' | 'failed'
  stages: PipelineStageResult[]
  metrics: PipelineMetrics
  error: { code: string; message: string } | null
}

/** Discriminated outcome of `Pipeline.run`. */
export type PipelineResult =
  | {
      status: 'completed'
      response: PipelineResponse
      summary: PipelineExecutionSummary
    }
  | {
      status: 'failed'
      error: BaseApplicationError
      summary: PipelineExecutionSummary
    }
