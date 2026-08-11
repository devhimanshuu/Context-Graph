import type { ComplianceTag, EntityId, NodeStatus, NodeType, Score } from '@contextgraph/types'
import type { CompressionHint } from './compression-hint'
import type { InclusionReason } from '../../rule-engine/domain/inclusion-reason'

/**
 * A candidate — a rule-passing knowledge node selected for a context package.
 *
 * Produced by the CandidateBuilder from rule-engine output and optimized for
 * downstream context assembly: it carries the fields assembly needs (type,
 * importance, distance, compliance tags, compression hint) without duplicating
 * the full database entity. `content` is intentionally NOT part of the
 * candidate; the package assembler attaches content when rendering.
 */
export interface CandidateNode {
  readonly nodeId: EntityId
  readonly workspaceId: EntityId
  readonly organizationId: EntityId
  readonly departmentId: EntityId | null
  readonly title: string
  readonly type: NodeType
  readonly status: NodeStatus
  readonly importance: Score
  /** Hop distance from the entry node (0 = the entry node itself). */
  readonly distance: number
  /** 0-100 genericness score; higher = more likely derivable. */
  readonly derivabilityScore: Score | null
  readonly complianceTags: readonly ComplianceTag[]
  /** Why the node entered the candidate set (stable enum). */
  readonly inclusionReason: InclusionReason
  /** How the assembler should treat this node's content. */
  readonly compressionHint: CompressionHint
  readonly metadata: Readonly<Record<string, unknown>>
}

/**
 * A candidate after deterministic ranking. `score` and `rank` are assigned by
 * the CandidateRanker — rank 1 is the highest-priority candidate in the final
 * package.
 */
export interface RankedCandidate extends CandidateNode {
  readonly score: number
  readonly rank: number
}
