import type { EntityId, Metadata, Timestamp } from '@contextgraph/types'
import { BaseEntity } from '../../../common/base/base-entity'
import type {
  PipelineRunMetrics,
  PipelineTraceEntry,
} from '../contracts/context-pipeline.contracts'
import type {
  CandidateExclusion,
  ContextPackageCandidate,
} from '../contracts/context-pipeline.contracts'

/**
 * Immutable record of one context-pipeline execution. Append-only: the
 * orchestrator creates it on every run (success or failure) and it is never
 * updated or deleted. The JSON payloads (validated request, stage results,
 * metrics, package candidates/exclusions) let any historical execution be
 * replayed deterministically and audited.
 */
export class PipelineRunEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId,
    readonly actorId: EntityId | null,
    readonly requestId: string,
    readonly packageId: string | null,
    readonly version: string,
    readonly mode: string,
    readonly strategy: string,
    readonly entryNodeId: EntityId,
    readonly maxDepth: number,
    readonly tokenBudget: number,
    readonly maxCandidates: number,
    readonly evaluatedAt: Timestamp,
    readonly status: string,
    readonly failedStageId: string | null,
    readonly request: Metadata,
    readonly trace: readonly PipelineTraceEntry[],
    readonly metrics: PipelineRunMetrics | null,
    readonly candidates: readonly ContextPackageCandidate[],
    readonly exclusions: readonly CandidateExclusion[],
    readonly error: { code: string; message: string } | null,
    readonly tokensUsed: number,
    readonly createdAt: Timestamp,
    /** Client-supplied idempotency key (null when the request had none). */
    readonly idempotencyKey: string | null = null,
  ) {
    super()
  }

  get updatedAt(): Timestamp {
    return this.createdAt
  }

  get deletedAt(): Timestamp | null {
    return null
  }
}
