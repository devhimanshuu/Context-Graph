import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from '../../../common/exceptions/app.exception'
import type { GraphNodeId } from '../domain/graph-node'
import type { GraphValidationError } from '../domain/validation'

/** A referenced node does not exist in the loaded graph. */
export class GraphNodeNotFoundError extends AppException {
  readonly code = ERROR_CODES.GRAPH_NODE_NOT_FOUND
  readonly statusCode = 404

  constructor(nodeId: GraphNodeId) {
    super(`Graph node not found: ${nodeId}`, { nodeId })
  }
}

/** The traversal entry node could not be resolved (missing or filtered out). */
export class EntryNodeNotFoundError extends AppException {
  readonly code = ERROR_CODES.GRAPH_ENTRY_NOT_FOUND
  readonly statusCode = 404

  constructor(nodeId: GraphNodeId) {
    super(`Entry node not found: ${nodeId}`, { nodeId })
  }
}

/** The graph is cyclic — a hard invariant violation for a DAG platform. */
export class GraphCycleDetectedError extends AppException {
  readonly code = ERROR_CODES.GRAPH_CYCLE_DETECTED
  readonly statusCode = 422

  constructor(cycle: readonly GraphNodeId[] = []) {
    super(`Graph cycle detected: ${cycle.join(' -> ') || 'unknown cycle'}`, { cycle })
  }
}

/** The graph failed integrity validation. */
export class InvalidGraphError extends AppException {
  readonly code = ERROR_CODES.GRAPH_INVALID
  readonly statusCode = 422

  constructor(issues: readonly GraphValidationError[]) {
    super('Graph integrity validation failed', { issues })
  }
}

/** A single edge is structurally invalid. */
export class InvalidEdgeError extends AppException {
  readonly code = ERROR_CODES.GRAPH_INVALID_EDGE
  readonly statusCode = 422

  constructor(edgeId: string, reason: string) {
    super(`Invalid graph edge ${edgeId}: ${reason}`, { edgeId, reason })
  }
}

/** An edge connects a node to itself. */
export class SelfReferenceError extends AppException {
  readonly code = ERROR_CODES.GRAPH_SELF_REFERENCE
  readonly statusCode = 422

  constructor(edgeId: string, nodeId: GraphNodeId) {
    super(`Self-referencing graph edge ${edgeId} on node ${nodeId}`, { edgeId, nodeId })
  }
}

/** Unexpected failure while traversing the graph. */
export class GraphTraversalError extends AppException {
  readonly code = ERROR_CODES.GRAPH_TRAVERSAL
  readonly statusCode = 500

  constructor(message = 'Graph traversal failed', details?: unknown) {
    super(message, details)
  }
}
