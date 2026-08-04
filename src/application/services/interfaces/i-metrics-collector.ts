import { type MetricsContextDto } from '@/application/dto'
import { type PipelineStageKind } from '@/application/contracts/pipeline'

/**
 * Collects pipeline and stage metrics. Implementations may write to logs,
 * in-memory buffers, or an external metrics backend (Datadog, Prometheus)
 * — application code only sees this contract.
 */
export interface IMetricsCollector {
  /** Records the duration of one stage execution. */
  record(stage: PipelineStageKind, durationMs: number): Promise<void>

  /** Snapshot of the metrics collected so far for a request. */
  snapshot(requestId: string): Promise<MetricsContextDto>
}
