import { type TraversalContextDto } from '@/application/dto'
import { type NodeStatus, type NodeType } from '@/domain/enums'

/** Input to a graph traversal. */
export interface TraversalInput {
  organizationId: string
  workspaceId: string
  entryNodeIds: string[]
  maxDepth: number
  /** Optional traversal-time pruning by node type. */
  allowedNodeTypes?: NodeType[]
  /** Optional traversal-time pruning by node status. */
  allowedStatuses?: NodeStatus[]
}

/**
 * Graph traversal contract (BFS today; A* / weighted shortest-path later).
 *
 * Replaceability: implementations are registered in the DI container under
 * this token. Switching `BFSTraversal` for `AStarTraversal` requires changing
 * only the provider binding — no application code changes.
 */
export interface IGraphTraversalService {
  traverse(input: TraversalInput): Promise<TraversalContextDto>
}
