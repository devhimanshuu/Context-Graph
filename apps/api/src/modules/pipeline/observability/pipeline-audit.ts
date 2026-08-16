import { Inject, Injectable } from '@nestjs/common'
import type { EntityId, Timestamp } from '@contextgraph/types'
import { LOGGER, type ILogger } from '../../../common/interfaces/logger.interface'
import type { PipelineMode } from '../contracts/context-pipeline.contracts'

/** DI token for the pipeline audit logger. */
export const PIPELINE_AUDIT = Symbol('IPipelineAuditLogger')

/** Auditable facts of one pipeline run (never node content). */
export interface PipelineAuditSummary {
  readonly organizationId: EntityId
  readonly actorId: EntityId
  readonly requestId: string
  readonly mode: PipelineMode
  readonly workspaceId: EntityId
  readonly entryNodeId: EntityId
  readonly reachableNodes: number
  readonly includedCandidates: number
  readonly durationMs: number
  readonly evaluatedAt: Timestamp
  readonly failed: boolean
  readonly stageId: string | null
}

/**
 * Pipeline audit seam. The orchestrator records every run (success or
 * failure) through this contract. Default: structured logs; a future binding
 * may forward to the AuditLog table or an event bus. Sensitive content is
 * never logged.
 */
export abstract class IPipelineAuditLogger {
  abstract recordRun(summary: PipelineAuditSummary): Promise<void>
}

/** Default binding: structured logs. */
@Injectable()
export class PipelineAuditLogger implements IPipelineAuditLogger {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async recordRun(summary: PipelineAuditSummary): Promise<void> {
    if (summary.failed) {
      this.logger.error('Context pipeline failed', {
        organizationId: summary.organizationId,
        actorId: summary.actorId,
        requestId: summary.requestId,
        mode: summary.mode,
        workspaceId: summary.workspaceId,
        entryNodeId: summary.entryNodeId,
        stageId: summary.stageId,
        durationMs: summary.durationMs,
      })
      return
    }
    this.logger.info('Context pipeline executed', {
      organizationId: summary.organizationId,
      actorId: summary.actorId,
      requestId: summary.requestId,
      mode: summary.mode,
      workspaceId: summary.workspaceId,
      entryNodeId: summary.entryNodeId,
      reachableNodes: summary.reachableNodes,
      includedCandidates: summary.includedCandidates,
      durationMs: summary.durationMs,
    })
  }
}
