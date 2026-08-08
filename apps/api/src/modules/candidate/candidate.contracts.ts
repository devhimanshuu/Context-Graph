import type { EntityId, Metadata, Score } from '@contextgraph/types'

/* A candidate node — a knowledge node selected for a context package, */
export interface CandidateNode {
  nodeId: EntityId
  workspaceId: EntityId
  title: string
  type: string
  /** Distance from the entry node (used for compression/ranking). */
  distance: number
  importance: Score
  derivabilityScore: Score
  metadata: Metadata
}

export interface BuildCandidateSetInput {
  workspaceId: EntityId
  nodeIds: EntityId[]
  distances: Record<string, number>
  maxCandidates: number
}

export interface BuildCandidateSetResult {
  candidates: CandidateNode[]
  truncated: boolean
}
