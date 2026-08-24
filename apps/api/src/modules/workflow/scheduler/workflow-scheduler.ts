/* Workflow scheduler — identifies ready nodes, manages parallelism, evaluates conditions.

The scheduler is a pure function of workflow state. It does NOT perform side effects.
*/

import { Injectable } from '@nestjs/common'
import type {
  EntityId,
  Metadata,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
} from '@contextgraph/types'
import type { IWorkflowScheduler } from '../domain/workflow.interfaces'

@Injectable()
export class WorkflowScheduler implements IWorkflowScheduler {
  getReadyNodes(
    _execution: WorkflowExecution,
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
    completedNodeIds: readonly EntityId[],
    failedNodeIds: readonly EntityId[],
    runningNodeIds: readonly EntityId[],
  ): readonly WorkflowNode[] {
    const completedSet = new Set(completedNodeIds)
    const failedSet = new Set(failedNodeIds)
    const runningSet = new Set(runningNodeIds)
    const ready: WorkflowNode[] = []

    for (const node of nodes) {
      // Skip nodes that are already completed, failed, or running
      if (completedSet.has(node.nodeId)) continue
      if (failedSet.has(node.nodeId)) continue
      if (runningSet.has(node.nodeId)) continue

      // Find all incoming edges for this node
      const incomingEdges = edges.filter((e) => e.targetNodeId === node.nodeId)

      // If no incoming edges, it's an entry node — always ready
      if (incomingEdges.length === 0) {
        ready.push(node)
        continue
      }

      // Check if ALL source nodes of incoming edges are completed
      const allDependenciesMet = incomingEdges.every((edge) => completedSet.has(edge.sourceNodeId))

      if (allDependenciesMet) {
        ready.push(node)
      }
    }

    return ready
  }

  isWorkflowComplete(
    nodes: readonly WorkflowNode[],
    completedNodeIds: readonly EntityId[],
    failedNodeIds: readonly EntityId[],
  ): boolean {
    const completedSet = new Set(completedNodeIds)
    const failedSet = new Set(failedNodeIds)

    // All nodes must be either completed or failed (or SKIPPED, which is considered done)
    return nodes.every((node) => completedSet.has(node.nodeId) || failedSet.has(node.nodeId))
  }

  evaluateCondition(condition: string, context: Metadata): boolean {
    // Deterministic condition evaluation — no arbitrary code execution
    // Supports simple comparisons against context values
    // Format: "field operator value" e.g., "confidence >= 0.8"

    try {
      const parsed = JSON.parse(condition) as ConditionExpression
      const fieldValue = context[parsed.field]

      if (fieldValue === undefined) return false

      switch (parsed.operator) {
        case '>=':
          return Number(fieldValue) >= Number(parsed.value)
        case '<=':
          return Number(fieldValue) <= Number(parsed.value)
        case '>':
          return Number(fieldValue) > Number(parsed.value)
        case '<':
          return Number(fieldValue) < Number(parsed.value)
        case '==':
          return String(fieldValue) === String(parsed.value)
        case '!=':
          return String(fieldValue) !== String(parsed.value)
        case 'contains':
          return String(fieldValue).includes(String(parsed.value))
        case 'exists':
          return fieldValue !== null && fieldValue !== undefined
        default:
          return false
      }
    } catch {
      // Invalid condition format — fail closed
      return false
    }
  }
}

interface ConditionExpression {
  readonly field: string
  readonly operator: string
  readonly value: string | number | boolean
}
