import type { EntityId, NodeStatus, NodeType } from '@contextgraph/types'

/** Stable identifier of a node inside a domain graph. */
export type GraphNodeId = EntityId

/**
 * In-memory node of a domain graph. Deliberately a projection — the traversal
 * engine only needs identity plus a title for readable output. Full entity
 * data (content, compliance tags, …) belongs to later modules, not the engine.
 */
export interface GraphNode {
  readonly id: GraphNodeId
  readonly title: string
  readonly type: NodeType
  readonly status: NodeStatus
}
