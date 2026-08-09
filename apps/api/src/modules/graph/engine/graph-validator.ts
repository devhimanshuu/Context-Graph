import { Injectable } from '@nestjs/common'
import { Graph } from '../domain/graph'
import type { GraphEdge } from '../domain/graph-edge'
import type { GraphNode } from '../domain/graph-node'
import {
  GraphValidationIssueType,
  type GraphValidationError,
  type GraphValidationResult,
} from '../domain/validation'
import { CycleDetector } from './cycle-detector'

/**
 * Validates a domain graph against the DAG invariant.
 *
 * Detects: cycles, self-referencing edges, edges with missing endpoints
 * (broken edges), duplicate edges, and structurally invalid edges. The BFS
 * engine trusts the graph; validation is the explicit gate that keeps the DAG
 * invariant intact — call it at build time or as a maintenance operation.
 */
@Injectable()
export class GraphValidator {
  constructor(private readonly cycleDetector: CycleDetector) {}

  /** Validates an already-constructed graph. */
  validateGraph(graph: Graph): GraphValidationResult {
    return this.validate(graph.getNodes(), this.collectEdges(graph))
  }

  /** Validates node/edge collections before (or after) building a graph. */
  validate(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphValidationResult {
    const errors: GraphValidationError[] = []
    const nodeIds = new Set(nodes.map((node) => node.id))
    const seenEdges = new Set<string>()

    for (const edge of edges) {
      const edgeKey = `${edge.sourceId}:${edge.targetId}:${edge.relationshipType}`

      if (!edge.id || !edge.sourceId || !edge.targetId) {
        errors.push({
          type: GraphValidationIssueType.INVALID_EDGE,
          message: 'Edge is missing an id or an endpoint',
          edgeId: edge.id,
        })
        continue
      }

      if (edge.sourceId === edge.targetId) {
        errors.push({
          type: GraphValidationIssueType.SELF_REFERENCE,
          message: `Edge ${edge.id} connects node ${edge.sourceId} to itself`,
          nodeId: edge.sourceId,
          edgeId: edge.id,
        })
      }

      if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
        const missing = !nodeIds.has(edge.sourceId) ? edge.sourceId : edge.targetId
        errors.push({
          type: GraphValidationIssueType.MISSING_NODE,
          message: `Edge ${edge.id} references unknown node ${missing}`,
          nodeId: missing,
          edgeId: edge.id,
        })
      }

      if (seenEdges.has(edgeKey)) {
        errors.push({
          type: GraphValidationIssueType.DUPLICATE_EDGE,
          message: `Duplicate edge ${edgeKey}`,
          edgeId: edge.id,
        })
      }
      seenEdges.add(edgeKey)
    }

    // Cycle detection runs on the built graph (adjacency views already ignore
    // broken edges). A self-reference is caught above, before graph build.
    const graph = new Graph(nodes, edges)
    const cycle = this.cycleDetector.findCycle(graph)
    if (cycle.length > 0) {
      errors.push({
        type: GraphValidationIssueType.CYCLE,
        message: `Cycle detected: ${cycle.join(' -> ')}`,
        nodeId: cycle[0],
        cycle,
      })
    }

    return { valid: errors.length === 0, errors }
  }

  private collectEdges(graph: Graph): GraphEdge[] {
    const seen = new Set<string>()
    const edges: GraphEdge[] = []
    for (const node of graph.getNodes()) {
      for (const edge of graph.parentsOf(node.id)) {
        if (seen.has(edge.id)) continue
        seen.add(edge.id)
        edges.push(edge)
      }
    }
    return edges
  }
}
