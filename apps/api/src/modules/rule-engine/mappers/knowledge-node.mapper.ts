import type { KnowledgeNodeEntity } from '../../knowledge/knowledge.entity'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleCandidateNode } from '../domain/candidate-node'

export interface KnowledgeNodeToCandidateOptions {
  /** Hop distance from the entry node (null when not from a traversal). */
  readonly distance?: number | null
  /** Why the node entered the candidate set. Defaults to LOCAL_REACHABILITY. */
  readonly inclusionReason?: InclusionReason
}

/**
 * Maps a knowledge node into the rule engine's candidate shape.
 *
 * The rule engine is decoupled from Prisma AND from the graph engine — this
 * is the module-boundary adapter. Callers (graph reachability composition,
 * knowledge module, future pipeline) map their own models into this shape.
 * `ownerId` is the node's creator, which the permission rule's visibility
 * policy evaluates against.
 */
export function knowledgeEntityToCandidateNode(
  entity: KnowledgeNodeEntity,
  options: KnowledgeNodeToCandidateOptions = {},
): RuleCandidateNode {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    departmentId: entity.departmentId,
    title: entity.title,
    type: entity.type,
    status: entity.status,
    importance: entity.importance,
    derivabilityScore: entity.derivabilityScore,
    complianceTags: [...entity.complianceTags],
    validFrom: entity.validFrom,
    validTo: entity.validTo,
    ownerId: entity.createdById,
    inclusionReason: options.inclusionReason ?? InclusionReason.LOCAL_REACHABILITY,
    distance: options.distance === undefined ? 0 : options.distance,
    metadata: entity.metadata,
  }
}
