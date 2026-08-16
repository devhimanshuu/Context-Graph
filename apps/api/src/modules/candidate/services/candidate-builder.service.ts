import { Inject, Injectable } from '@nestjs/common'
import type { EntityId, Timestamp } from '@contextgraph/types'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { RuleCandidateNode } from '../../rule-engine/domain/candidate-node'
import type { CandidateNode } from '../domain/candidate-node'
import { deriveCompressionHint } from '../domain/compression-hint'

export interface BuildCandidateSetInput {
  readonly workspaceId: EntityId
  /** Anchors the package; the entry node always gets the FULL hint. */
  readonly entryNodeId: EntityId
  /** Rule-passing candidates (the authorized, filtered set). */
  readonly nodes: readonly RuleCandidateNode[]
  /** Fixed evaluation instant — part of the deterministic input universe. */
  readonly evaluatedAt: Timestamp
}

export interface BuildCandidateSetResult {
  /** Built candidates, deduplicated, in deterministic input order. */
  readonly candidates: readonly CandidateNode[]
}

export abstract class ICandidateBuilder {
  abstract build(input: BuildCandidateSetInput): Promise<BuildCandidateSetResult>
}

/**
 * Candidate builder — the boundary between the rule engine and the context
 * package. It adapts RuleCandidateNode into CandidateNode, attaching the
 * deterministic compression hint and guaranteeing the invariant that the
 * final set contains no duplicate node ids (defense in depth — the rule
 * engine already deduplicates).
 *
 * It does NOT rank or truncate; that is the CandidateRanker's responsibility.
 */
@Injectable()
export class CandidateBuilder implements ICandidateBuilder {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async build(input: BuildCandidateSetInput): Promise<BuildCandidateSetResult> {
    const seen = new Set<EntityId>()
    const candidates: CandidateNode[] = []

    for (const node of input.nodes) {
      if (seen.has(node.id)) continue
      seen.add(node.id)

      const distance = node.distance ?? 0
      candidates.push({
        nodeId: node.id,
        workspaceId: input.workspaceId,
        organizationId: node.organizationId,
        departmentId: node.departmentId,
        title: node.title,
        type: node.type,
        status: node.status,
        importance: node.importance,
        distance,
        derivabilityScore: node.derivabilityScore,
        complianceTags: [...node.complianceTags],
        validTo: node.validTo,
        inclusionReason: node.inclusionReason,
        compressionHint: deriveCompressionHint({
          distance,
          derivabilityScore: node.derivabilityScore,
          importance: node.importance,
          inclusionReason: node.inclusionReason,
        }),
        metadata: { ...node.metadata },
      })
    }

    this.logger.debug('Candidate set built', {
      workspaceId: input.workspaceId,
      candidates: candidates.length,
    })

    return { candidates }
  }
}
