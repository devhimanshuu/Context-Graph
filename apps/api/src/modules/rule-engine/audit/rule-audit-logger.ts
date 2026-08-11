import { Inject, Injectable } from '@nestjs/common'
import type { EntityId, Timestamp } from '@contextgraph/types'
import { LOGGER, type ILogger } from '../../../common/interfaces/logger.interface'
import type { RuleReasonCode } from '../domain/reason-codes'

/** DI token for the rule audit logger. */
export const RULE_AUDIT_LOGGER = Symbol('IRuleAuditLogger')

/** One excluded node: pipeline → node → rule → decision → reason. */
export interface RuleExclusionAuditEntry {
  readonly organizationId: EntityId
  readonly actorId: EntityId
  readonly requestId: string
  readonly nodeId: EntityId
  readonly ruleId: string
  readonly reasonCode: RuleReasonCode
  readonly reason: string
  readonly evaluatedAt: Timestamp
}

/** Per-run summary, emitted once per execution. */
export interface RuleRunAuditSummary {
  readonly organizationId: EntityId
  readonly actorId: EntityId
  readonly requestId: string
  readonly initialCount: number
  readonly injectedCount: number
  readonly finalCount: number
  readonly durationMs: number
  readonly evaluatedAt: Timestamp
}

/**
 * Rule evaluation audit seam. Decisions are fully traceable via the response
 * explanations; this contract forwards the important events to the platform's
 * audit/logging pipeline (default: structured logs; future: AuditLog table or
 * an event bus). Sensitive content is never logged.
 */
export abstract class IRuleAuditLogger {
  abstract recordExclusion(entry: RuleExclusionAuditEntry): Promise<void>
  abstract recordPipelineRun(summary: RuleRunAuditSummary): Promise<void>
}

/** Default binding: structured logs. */
@Injectable()
export class RuleAuditLogger implements IRuleAuditLogger {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async recordExclusion(entry: RuleExclusionAuditEntry): Promise<void> {
    this.logger.debug('Rule excluded node', {
      organizationId: entry.organizationId,
      actorId: entry.actorId,
      requestId: entry.requestId,
      nodeId: entry.nodeId,
      ruleId: entry.ruleId,
      reasonCode: entry.reasonCode,
    })
  }

  async recordPipelineRun(summary: RuleRunAuditSummary): Promise<void> {
    this.logger.info('Rule pipeline executed', {
      organizationId: summary.organizationId,
      actorId: summary.actorId,
      requestId: summary.requestId,
      initialCount: summary.initialCount,
      injectedCount: summary.injectedCount,
      finalCount: summary.finalCount,
      durationMs: summary.durationMs,
    })
  }
}
