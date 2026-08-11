import { Injectable } from '@nestjs/common'
import type { RuleEvaluationResult } from '../domain/rule-result'
import type { RuleExecutionMetrics } from '../domain/rule-execution-metrics'

/** DI token for the rule metrics collector. */
export const RULE_METRICS = Symbol('IRuleMetrics')

/** Aggregate counters exposed for observability (Prometheus-ready seam). */
export interface RuleMetricsSnapshot {
  readonly decisions: number
  readonly passes: number
  readonly failures: number
  readonly failuresByReason: Readonly<Record<string, number>>
  readonly runs: number
  readonly totalNodesProcessed: number
  readonly totalDurationMs: number
}

/**
 * Rule engine observability seam. The engine records decisions and run
 * summaries through this contract; swapping in a Prometheus/Datadog exporter
 * never touches rule code.
 */
export abstract class IRuleMetrics {
  abstract recordDecision(result: RuleEvaluationResult): void
  abstract recordRun(metrics: RuleExecutionMetrics): void
  abstract snapshot(): RuleMetricsSnapshot
}

/** In-memory default binding. */
@Injectable()
export class InMemoryRuleMetrics extends IRuleMetrics {
  private decisions = 0
  private passes = 0
  private failures = 0
  private readonly failuresByReason = new Map<string, number>()
  private runs = 0
  private totalNodesProcessed = 0
  private totalDurationMs = 0

  recordDecision(result: RuleEvaluationResult): void {
    this.decisions += 1
    if (result.passed) {
      this.passes += 1
    } else {
      this.failures += 1
      this.failuresByReason.set(
        result.reasonCode,
        (this.failuresByReason.get(result.reasonCode) ?? 0) + 1,
      )
    }
  }

  recordRun(metrics: RuleExecutionMetrics): void {
    this.runs += 1
    this.totalNodesProcessed += metrics.initialCount
    this.totalDurationMs += metrics.totalDurationMs
  }

  snapshot(): RuleMetricsSnapshot {
    return {
      decisions: this.decisions,
      passes: this.passes,
      failures: this.failures,
      failuresByReason: Object.fromEntries(this.failuresByReason),
      runs: this.runs,
      totalNodesProcessed: this.totalNodesProcessed,
      totalDurationMs: this.totalDurationMs,
    }
  }
}
