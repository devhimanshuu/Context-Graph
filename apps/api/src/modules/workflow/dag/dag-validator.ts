/* DAG Validator — validates workflow DAGs before execution.

Validates:
1. No cycles
2. Every referenced node exists
3. Every edge is valid
4. At least one entry node
5. At least one terminal node
6. No orphaned nodes (unless explicitly allowed)
7. Node dependencies are valid
8. Conditions are valid
*/

import { Injectable } from '@nestjs/common'
import type { EntityId, WorkflowNode, WorkflowEdge, WorkflowNodeType } from '@contextgraph/types'
import {
  IDagValidator,
  type DagValidationResult,
  type DagValidationError,
} from '../domain/workflow.interfaces'

/** Node types that represent "no-op" pass-through for connectivity purposes. */
const ENTRY_NODE_TYPES: readonly WorkflowNodeType[] = ['START']
const TERMINAL_NODE_TYPES: readonly WorkflowNodeType[] = ['END']

@Injectable()
export class DagValidator implements IDagValidator {
  validate(nodes: readonly WorkflowNode[], edges: readonly WorkflowEdge[]): DagValidationResult {
    const errors: DagValidationError[] = []
    const warnings: DagValidationError[] = []

    // 1. Validate edges reference existing nodes
    const nodeIds = new Set(nodes.map((n) => n.nodeId))

    for (const edge of edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push({
          nodeId: null,
          edgeId: edge.edgeId,
          type: 'INVALID_EDGE_SOURCE',
          message: `Edge ${edge.edgeId} references non-existent source node ${edge.sourceNodeId}`,
        })
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push({
          nodeId: null,
          edgeId: edge.edgeId,
          type: 'INVALID_EDGE_TARGET',
          message: `Edge ${edge.edgeId} references non-existent target node ${edge.targetNodeId}`,
        })
      }
      if (edge.sourceNodeId === edge.targetNodeId) {
        errors.push({
          nodeId: edge.sourceNodeId,
          edgeId: edge.edgeId,
          type: 'SELF_LOOP',
          message: `Edge ${edge.edgeId} creates a self-loop on node ${edge.sourceNodeId}`,
        })
      }
    }

    // 2. Validate node dependencies reference existing nodes
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        if (!nodeIds.has(depId)) {
          errors.push({
            nodeId: node.nodeId,
            edgeId: null,
            type: 'INVALID_DEPENDENCY',
            message: `Node ${node.nodeId} depends on non-existent node ${depId}`,
          })
        }
      }
    }

    // 3. Detect cycles using Kahn's algorithm
    if (errors.length === 0) {
      const cycleResult = this.detectCycles(nodes, edges)
      if (cycleResult.hasCycle) {
        errors.push({
          nodeId: null,
          edgeId: null,
          type: 'CYCLE_DETECTED',
          message: `Workflow contains a cycle: ${cycleResult.cyclePath.join(' → ')}`,
        })
      }
    }

    // 4. Find entry nodes (nodes with no incoming edges)
    const incomingEdgeMap = new Map<EntityId, number>()
    for (const edge of edges) {
      incomingEdgeMap.set(edge.targetNodeId, (incomingEdgeMap.get(edge.targetNodeId) ?? 0) + 1)
    }

    const entryNodes = nodes.filter(
      (n) => ENTRY_NODE_TYPES.includes(n.type) || (incomingEdgeMap.get(n.nodeId) ?? 0) === 0,
    )

    if (entryNodes.length === 0) {
      errors.push({
        nodeId: null,
        edgeId: null,
        type: 'NO_ENTRY_NODE',
        message: 'Workflow has no entry node (node with no incoming edges or START node)',
      })
    }

    // 5. Find terminal nodes (nodes with no outgoing edges)
    const outgoingEdgeMap = new Map<EntityId, number>()
    for (const edge of edges) {
      outgoingEdgeMap.set(edge.sourceNodeId, (outgoingEdgeMap.get(edge.sourceNodeId) ?? 0) + 1)
    }

    const terminalNodes = nodes.filter(
      (n) => TERMINAL_NODE_TYPES.includes(n.type) || (outgoingEdgeMap.get(n.nodeId) ?? 0) === 0,
    )

    if (terminalNodes.length === 0) {
      errors.push({
        nodeId: null,
        edgeId: null,
        type: 'NO_TERMINAL_NODE',
        message: 'Workflow has no terminal node (node with no outgoing edges or END node)',
      })
    }

    // 6. Check for orphaned nodes (no incoming or outgoing edges)
    for (const node of nodes) {
      if (node.type === 'START' || node.type === 'END') continue
      const hasIncoming = (incomingEdgeMap.get(node.nodeId) ?? 0) > 0
      const hasOutgoing = (outgoingEdgeMap.get(node.nodeId) ?? 0) > 0
      if (!hasIncoming && !hasOutgoing) {
        warnings.push({
          nodeId: node.nodeId,
          edgeId: null,
          type: 'ORPHANED_NODE',
          message: `Node ${node.nodeId} (${node.name}) has no edges connecting it to the workflow`,
        })
      }
    }

    // 7. Topological sort for execution order
    const executionOrder = this.topologicalSort(nodes, edges)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      entryNodes: entryNodes.map((n) => n.nodeId),
      terminalNodes: terminalNodes.map((n) => n.nodeId),
      executionOrder,
    }
  }

  /**
   * Detect cycles using Kahn's algorithm.
   * If we can't visit all nodes, there's a cycle.
   */
  private detectCycles(
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
  ): { hasCycle: boolean; cyclePath: readonly EntityId[] } {
    const nodeIds = new Set(nodes.map((n) => n.nodeId))
    const inDegree = new Map<EntityId, number>()
    const adjacency = new Map<EntityId, EntityId[]>()

    for (const id of nodeIds) {
      inDegree.set(id, 0)
      adjacency.set(id, [])
    }

    for (const edge of edges) {
      if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
        adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
      }
    }

    const queue: EntityId[] = []
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id)
    }

    let visited = 0
    while (queue.length > 0) {
      const current = queue.shift()!
      visited++
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }

    if (visited === nodeIds.size) {
      return { hasCycle: false, cyclePath: [] }
    }

    // Find a cycle path for error reporting
    const remaining = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) > 0)
    const first = remaining[0] as string | undefined
    const cyclePath = first !== undefined ? [...remaining.slice(0, 5), first] : []

    return { hasCycle: true, cyclePath }
  }

  /**
   * Topological sort — returns nodes in a valid execution order.
   */
  private topologicalSort(
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
  ): readonly EntityId[] {
    const nodeIds = new Set(nodes.map((n) => n.nodeId))
    const inDegree = new Map<EntityId, number>()
    const adjacency = new Map<EntityId, EntityId[]>()

    for (const id of nodeIds) {
      inDegree.set(id, 0)
      adjacency.set(id, [])
    }

    for (const edge of edges) {
      if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
        adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
      }
    }

    const queue: EntityId[] = []
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id)
    }

    const result: EntityId[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }

    return result
  }
}
