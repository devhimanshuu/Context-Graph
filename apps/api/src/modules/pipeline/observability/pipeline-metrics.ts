import { Injectable } from '@nestjs/common'
import type { PipelineMode } from '../contracts/context-pipeline.contracts'
import type { PipelineRunMetrics } from '../contracts/context-pipeline.contracts'

/** DI token for the pipeline metrics collector. */
export const PIPELINE_METRICS = Symbol('IPipelineMetrics')

export interface PipelineMetricsSnapshot {
  readonly runs: number
  readonly completions: number
  readonly failures: number
  readonly byMode: Readonly<Record<string, number>>
  readonly totalDurationMs: number
  readonly totalIncludedCandidates: number
}

/**
 * Pipeline observability seam. The orchestrator records run outcomes through
 * this contract; swapping in a Prometheus/Datadog/OpenTelemetry exporter never
 * touches pipeline code.
 */
export abstract class IPipelineMetrics {
  abstract recordRun(mode: PipelineMode, metrics: PipelineRunMetrics, failed: boolean): void
  abstract snapshot(): PipelineMetricsSnapshot
}

/** In-memory default binding. */
@Injectable()
export class InMemoryPipelineMetrics extends IPipelineMetrics {
  private runs = 0
  private completions = 0
  private failures = 0
  private readonly byMode = new Map<string, number>()
  private totalDurationMs = 0
  private totalIncludedCandidates = 0

  recordRun(mode: PipelineMode, metrics: PipelineRunMetrics, failed: boolean): void {
    this.runs += 1
    if (failed) {
      this.failures += 1
    } else {
      this.completions += 1
      this.totalDurationMs += metrics.totalDurationMs
      this.totalIncludedCandidates += metrics.includedCandidates
    }
    this.byMode.set(mode, (this.byMode.get(mode) ?? 0) + 1)
  }

  snapshot(): PipelineMetricsSnapshot {
    return {
      runs: this.runs,
      completions: this.completions,
      failures: this.failures,
      byMode: Object.fromEntries(this.byMode),
      totalDurationMs: this.totalDurationMs,
      totalIncludedCandidates: this.totalIncludedCandidates,
    }
  }
}
