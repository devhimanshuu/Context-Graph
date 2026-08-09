/**
 * Explicit traversal direction for a graph edge.
 *
 * ContextGraph stores edges as `sourceId -> targetId`. The database does not
 * say which end is the "child" (more specific knowledge) and which is the
 * "parent" (more general/supporting knowledge) — that is a domain decision.
 * This module makes the interpretation explicit instead of letting traversal
 * code assume the raw source/target terminology means anything.
 */
export const TraversalDirection = {
  /**
   * source -> target is a child -> parent hop. BFS moves upward toward
   * ancestors by following edges out of the source (the entry/specific node).
   */
  UP: 'UP',
  /**
   * target -> source is a child -> parent hop. BFS moves downward toward
   * descendants by following edges into the target (the general node).
   */
  DOWN: 'DOWN',
} as const

export type TraversalDirection = (typeof TraversalDirection)[keyof typeof TraversalDirection]
