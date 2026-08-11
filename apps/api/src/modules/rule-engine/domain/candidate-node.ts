import type {
  ComplianceTag,
  EntityId,
  Metadata,
  NodeStatus,
  NodeType,
  Score,
  Timestamp,
} from '@contextgraph/types'
import type { InclusionReason } from './inclusion-reason'

/**
 * The unit of rule evaluation. Decoupled from Prisma and from the graph
 * engine: callers (graph reachability, knowledge module, future pipeline)
 * map their own models into this shape at the module boundary.
 *
 * The engine treats this as the "authorized node set" — it answers which of
 * these nodes should remain in the final context, not what is reachable or
 * who may see it.
 */
export interface RuleCandidateNode {
  readonly id: EntityId
  readonly organizationId: EntityId
  /** Owning tenant — the isolation rule's defense-in-depth boundary. */
  readonly workspaceId: EntityId
  readonly departmentId: EntityId | null
  readonly title: string
  readonly type: NodeType
  readonly status: NodeStatus
  readonly importance: Score
  /** 0-100 genericness score (higher = more likely derivable). Null when unknown. */
  readonly derivabilityScore: Score | null
  readonly complianceTags: readonly ComplianceTag[]
  /** Inclusive validity window (UTC). Null = unbounded. */
  readonly validFrom: Timestamp | null
  readonly validTo: Timestamp | null
  /** Owning principal; used by the permission rule's visibility policy. */
  readonly ownerId: EntityId | null
  /** Why the node entered the candidate set. */
  readonly inclusionReason: InclusionReason
  /** Hop distance from the entry node, when known from traversal. */
  readonly distance: number | null
  readonly metadata: Metadata
}
