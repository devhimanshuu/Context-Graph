/**
 * Strongly typed metrics configuration.
 */
export interface MetricsConfig {
  enabled: boolean
  /** How often buffered metrics are flushed to the backend. */
  flushIntervalMs: number
  /** Metric dimensions emitted (e.g. organizationId, workspaceId, stage). */
  dimensions: string[]
}
