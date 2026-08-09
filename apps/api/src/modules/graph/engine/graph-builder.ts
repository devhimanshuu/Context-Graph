import { Injectable } from '@nestjs/common'
import type { GraphEdgeEntity } from '../graph-edge.entity'
import type { NodeProjection } from '../graph.repository'
import { Graph } from '../domain/graph'
import type { GraphEdge } from '../domain/graph-edge'
import type { GraphNode } from '../domain/graph-node'
import {
  TraversalDirection,
  type TraversalDirection as DirectionValue,
} from '../domain/graph-direction'
import { GraphCycleDetectedError, InvalidGraphError } from '../errors/graph-errors'
import { GraphValidationIssueType } from '../domain/validation'
import { GraphValidator } from './graph-validator'

export interface GraphBuildOptions {
  /** Validate the DAG invariant before returning the graph. Default: true. */
  readonly validate?: boolean
  /** Edge interpretation. Defaults to UP (source = child, target = parent). */
  readonly direction?: DirectionValue
}

/**
 * Builds an in-memory domain `Graph` from repository rows.
 *
 * The database is queried in batches (all edges of a workspace in one query,
 * node projections batched by id), so building is 2 queries per workspace no
 * matter the graph size — never one query per node (no N+1). The domain graph
 * is then reused across traversals; a caching layer can memoize it later.
 */
@Injectable()
export class GraphBuilder {
  constructor(private readonly validator: GraphValidator) {}

  build(
    nodes: readonly NodeProjection[],
    edges: readonly GraphEdgeEntity[],
    options: GraphBuildOptions = {},
  ): Graph {
    const validate = options.validate ?? true
    const direction = options.direction ?? TraversalDirection.UP

    const graphNodes: GraphNode[] = nodes.map((node) => ({
      id: node.id,
      title: node.title,
      type: node.type,
      status: node.status,
    }))
    const graphEdges: GraphEdge[] = edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationshipType: edge.relationshipType,
      weight: edge.weight,
    }))

    if (validate) {
      const result = this.validator.validate(graphNodes, graphEdges)
      if (!result.valid) {
        const cycle = result.errors.find((error) => error.type === GraphValidationIssueType.CYCLE)
        if (cycle !== undefined) {
          throw new GraphCycleDetectedError(cycle.cycle ?? [])
        }
        throw new InvalidGraphError(result.errors)
      }
    }

    return new Graph(graphNodes, graphEdges, direction)
  }
}
