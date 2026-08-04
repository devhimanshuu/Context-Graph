import { type Logger } from '@/services/logging'

/**
 * Application logging contract.
 *
 * This is an alias of the canonical `Logger` contract (`src/services/logging`)
 * — the single source of truth. The DI container binds this token to the
 * console implementation today; swapping to Pino/Winston/Datadog/Sentry is a
 * provider-binding change only.
 */
export type ILogger = Logger

/** Structured audit entry — shape mirrors the domain `AuditLog` model. */
export interface AuditLogEntry {
  organizationId: string
  workspaceId: string | null
  actorId: string | null
  /** Stable action identifier, e.g. "pipeline.run", "node.filtered". */
  action: string
  entityType: string
  entityId: string
  before: unknown | null
  after: unknown | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  occurredAt: Date
}

/**
 * Append-only audit logging. Implementations persist to the `AuditLog` table
 * (via the repository) and/or forward to an external audit store. Event
 * handlers (pipeline lifecycle, permission decisions) depend on this
 * contract.
 */
export interface IAuditLogger {
  log(entry: AuditLogEntry): Promise<void>
}

/**
 * Metrics logging (counters, gauges, timings). Implementations forward to
 * Datadog, Prometheus, or an in-memory aggregator. Distinct from
 * `IMetricsCollector`, which records pipeline-run metrics into a snapshot;
 * this interface is for arbitrary application-level metrics.
 */
export interface IMetricsLogger {
  increment(name: string, value?: number, tags?: Record<string, string>): void
  gauge(name: string, value: number, tags?: Record<string, string>): void
  timing(name: string, durationMs: number, tags?: Record<string, string>): void
}
