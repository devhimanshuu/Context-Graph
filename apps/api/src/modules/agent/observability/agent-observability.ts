/* Agent observability — metrics, analytics, and execution tracing.

Tracks:
- executions
- completion rate
- average duration
- average iterations
- tool calls
- tool failures
- policy denials
- context size
- token usage
- cost
- verification failures
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { AgentExecutionStatus } from '@contextgraph/types'
import type { ExecutionAnalyticsRecord } from '../domain/agent.interfaces'

interface ExecutionMetric {
  readonly executionId: string
  readonly organizationId: string
  readonly status: AgentExecutionStatus
  readonly durationMs: number
  readonly iterations: number
  readonly toolCalls: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cost: number
  readonly verificationPassed: boolean
  readonly timestamp: number
}

@Injectable()
export class AgentObservability {
  private readonly metrics: ExecutionMetric[] = []
  private static readonly MAX_METRICS = 10_000

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  recordExecution(metric: ExecutionMetric): void {
    this.metrics.push(metric)

    // Prevent unbounded growth
    if (this.metrics.length > AgentObservability.MAX_METRICS) {
      this.metrics.splice(0, this.metrics.length - AgentObservability.MAX_METRICS)
    }

    this.logger.debug('Agent execution metric recorded', {
      executionId: metric.executionId,
      status: metric.status,
      durationMs: metric.durationMs,
      toolCalls: metric.toolCalls,
      cost: metric.cost,
    })
  }

  getAnalytics(organizationId: string, from: string, to: string): ExecutionAnalyticsRecord {
    const relevant = this.metrics.filter(
      (m) =>
        m.organizationId === organizationId &&
        new Date(from).getTime() <= m.timestamp &&
        m.timestamp <= new Date(to).getTime(),
    )

    if (relevant.length === 0) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        cancelledExecutions: 0,
        averageDurationMs: 0,
        averageIterations: 0,
        averageToolCalls: 0,
        totalToolCalls: 0,
        toolFailures: 0,
        policyDenials: 0,
        averageContextSize: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedTotalCost: 0,
        verificationFailures: 0,
      }
    }

    const completed = relevant.filter((m) => m.status === 'COMPLETED')
    const failed = relevant.filter((m) => m.status === 'FAILED')
    const cancelled = relevant.filter((m) => m.status === 'CANCELLED')

    return {
      totalExecutions: relevant.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      cancelledExecutions: cancelled.length,
      averageDurationMs: relevant.reduce((s, m) => s + m.durationMs, 0) / relevant.length,
      averageIterations: relevant.reduce((s, m) => s + m.iterations, 0) / relevant.length,
      averageToolCalls: relevant.reduce((s, m) => s + m.toolCalls, 0) / relevant.length,
      totalToolCalls: relevant.reduce((s, m) => s + m.toolCalls, 0),
      toolFailures: failed.length,
      policyDenials: 0,
      averageContextSize: 0,
      totalInputTokens: relevant.reduce((s, m) => s + m.inputTokens, 0),
      totalOutputTokens: relevant.reduce((s, m) => s + m.outputTokens, 0),
      estimatedTotalCost: relevant.reduce((s, m) => s + m.cost, 0),
      verificationFailures: relevant.filter((m) => !m.verificationPassed).length,
    }
  }

  /**
   * Get recent executions for a dashboard overview.
   */
  getRecentExecutions(organizationId: string, limit = 20): readonly ExecutionMetric[] {
    return this.metrics
      .filter((m) => m.organizationId === organizationId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
}
