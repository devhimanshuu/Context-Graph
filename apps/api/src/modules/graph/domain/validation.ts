import type { GraphNodeId } from './graph-node'

/** Kinds of integrity violations the GraphValidator can detect. */
export const GraphValidationIssueType = {
  /** An edge points to a node id absent from the graph. */
  MISSING_NODE: 'MISSING_NODE',
  /** An edge connects a node to itself. */
  SELF_REFERENCE: 'SELF_REFERENCE',
  /** More than one edge shares the same source, target and relationship type. */
  DUPLICATE_EDGE: 'DUPLICATE_EDGE',
  /** The graph contains at least one directed cycle. */
  CYCLE: 'CYCLE',
  /** An edge is structurally invalid (e.g. empty endpoint). */
  INVALID_EDGE: 'INVALID_EDGE',
} as const

export type GraphValidationIssueType =
  (typeof GraphValidationIssueType)[keyof typeof GraphValidationIssueType]

/** A single integrity violation with enough context to debug it. */
export interface GraphValidationError {
  readonly type: GraphValidationIssueType
  readonly message: string
  /** Node (or edge endpoint) involved in the violation, when applicable. */
  readonly nodeId?: GraphNodeId
  /** Edge id involved in the violation, when applicable. */
  readonly edgeId?: string
  /** Full cycle path, present when `type` is CYCLE. */
  readonly cycle?: readonly GraphNodeId[]
}

/** Outcome of a full graph integrity check. */
export interface GraphValidationResult {
  readonly valid: boolean
  readonly errors: readonly GraphValidationError[]
}
