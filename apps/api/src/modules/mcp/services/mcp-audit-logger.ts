/* MCP audit logger — records every tool invocation for audit trail.

Audit events are append-only and include session, outcome, latency, and
pipeline run ID where applicable. Sensitive data (tokens, raw prompts)
is never logged. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpAuditEvent } from '@contextgraph/types'
import { IMcpAuditLogger } from '../domain/mcp.interfaces'
import { ILogger, LOGGER } from '../../../common/interfaces/logger.interface'

/**
 * In-memory audit log for MCP tool invocations.
 * Production should persist to the database via the existing AuditModule.
 */
@Injectable()
export class McpAuditLogger implements IMcpAuditLogger {
  private readonly events: McpAuditEvent[] = []
  private readonly maxEvents = 10_000

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async recordEvent(event: McpAuditEvent): Promise<void> {
    // Append to in-memory buffer.
    this.events.push(event)

    // Trim oldest if over capacity.
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents)
    }

    // Structured log for observability pipelines.
    this.logger.info('MCP tool invocation', {
      sessionId: event.sessionId,
      toolName: event.toolName,
      outcome: event.outcome,
      latencyMs: event.latencyMs,
      pipelineRunId: event.pipelineRunId,
      organizationId: event.organizationId,
      principalId: event.principalId,
    })
  }

  /** Get recent audit events (for inspection/debugging). */
  getRecent(limit = 100): readonly McpAuditEvent[] {
    return this.events.slice(-limit)
  }

  /** Get events for a specific session. */
  getBySession(sessionId: string): readonly McpAuditEvent[] {
    return this.events.filter((e) => e.sessionId === sessionId)
  }
}
