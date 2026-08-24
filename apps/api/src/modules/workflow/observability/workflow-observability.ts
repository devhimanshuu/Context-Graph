/* Workflow observability — tracks metrics for workflow execution.

Metrics tracked:
  - Workflow duration
  - Node duration
  - Parallelism
  - Retries
  - Failures
  - Approval waits
  - Model usage
  - Tool calls
  - Token usage
  - Cost
*/

import { Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type {
  IWorkflowObservability,
  WorkflowExecutionMetric,
  WorkflowAnalyticsRecord,
} from '../domain/workflow.interfaces'

@Injectable()
export class WorkflowObservability implements IWorkflowObservability {
  private readonly metrics: WorkflowExecutionMetric[] = []

  recordExecution(metric: WorkflowExecutionMetric): void {
    this.metrics.push(metric)
  }

  getAnalytics(_organizationId: EntityId, from: string, to: string): WorkflowAnalyticsRecord {
    const fromDate = new Date(from).getTime()
    const toDate = new Date(to).getTime()

    const filtered = this.metrics.filter((m) => m.timestamp >= fromDate && m.timestamp <= toDate)

    if (filtered.length === 0) {
      return this.emptyAnalytics()
    }

    const completed = filtered.filter((m) => m.status === 'COMPLETED')
    const failed = filtered.filter((m) => m.status === 'FAILED')
    const cancelled = filtered.filter((m) => m.status === 'CANCELLED')
    const timedOut = filtered.filter((m) => m.status === 'TIMED_OUT')

    const avg = (field: keyof WorkflowExecutionMetric): number => {
      const sum = filtered.reduce((acc, m) => acc + (Number(m[field]) || 0), 0)
      return Math.round((sum / filtered.length) * 100) / 100
    }

    const sum = (field: keyof WorkflowExecutionMetric): number => {
      return filtered.reduce((acc, m) => acc + (Number(m[field]) || 0), 0)
    }

    return {
      totalExecutions: filtered.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      cancelledExecutions: cancelled.length,
      timedOutExecutions: timedOut.length,
      averageDurationMs: avg('durationMs'),
      averageNodeCount: avg('nodeCount'),
      averageAgentCalls: avg('agentCalls'),
      totalToolCalls: sum('toolCalls'),
      totalTokenUsage: sum('tokenUsage'),
      estimatedTotalCost: Math.round(sum('cost') * 100) / 100,
      averageRetries: avg('retries'),
      averageApprovalWaitMs: avg('approvalWaits'),
      authorizationViolations: 0, // tracked by security module
    }
  }

  private emptyAnalytics(): WorkflowAnalyticsRecord {
    return {
      totalExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      timedOutExecutions: 0,
      averageDurationMs: 0,
      averageNodeCount: 0,
      averageAgentCalls: 0,
      totalToolCalls: 0,
      totalTokenUsage: 0,
      estimatedTotalCost: 0,
      averageRetries: 0,
      averageApprovalWaitMs: 0,
      authorizationViolations: 0,
    }
  }
}
