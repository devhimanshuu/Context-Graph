/**
 * Strongly typed graph-traversal configuration.
 */
export interface TraversalConfig {
  /** Default algorithm; switch to 'A_STAR' without changing application code. */
  algorithm: 'BFS' | 'A_STAR'
  defaultMaxDepth: number
  /** Edges below this weight (0-1) are not traversed. */
  edgeWeightThreshold: number
  cycleDetection: boolean
  /** Safety cap on nodes visited in a single traversal. */
  visitedNodeLimit: number
}
