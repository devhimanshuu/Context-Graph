import { Inject, Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type {
  AssembledContext,
  ContextItem,
  ContextPriority,
  ContextSource,
} from '../domain/ai.types'
import type {
  IContextAssembler,
  AssembleContextInput,
  AssembleCandidateInput,
} from '../domain/ai.interfaces'

/** Priority assignment thresholds based on importance and distance. */
const CRITICAL_IMPORTANCE_THRESHOLD = 90
const HIGH_IMPORTANCE_THRESHOLD = 70
const NEAR_DISTANCE_THRESHOLD = 1

/**
 * Context Assembler — Phase 11 composition boundary.
 *
 * Converts ranked candidates from the ContextGraph pipeline into an ordered
 * context representation suitable for LLM consumption.
 *
 * Key responsibilities:
 * - Assign priority tiers based on importance and distance
 * - Order candidates deterministically
 * - Attach source attribution
 * - Compute context metadata (hash, version)
 *
 * The assembler does NOT:
 * - Perform authorization (already done by ContextGraph)
 * - Modify content (compression is separate)
 * - Make LLM calls
 */
@Injectable()
export class ContextAssembler implements IContextAssembler {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async assemble(input: AssembleContextInput): Promise<AssembledContext> {
    this.logger.debug('Assembling context', {
      candidateCount: input.candidates.length,
      entryNodeId: input.entryNodeId,
      workspaceId: input.workspaceId,
    })

    const items = input.candidates.map((candidate) => this.assembleItem(candidate))

    const ordered = this.orderDeterministically(items)
    const totalTokens = ordered.reduce((sum, item) => sum + item.tokens, 0)
    const sourceCount = new Set(ordered.map((item) => item.source.nodeId)).size

    const contextVersion = input.contextVersion
    const contextHash = this.computeHash(ordered, contextVersion)
    const assembledAt = new Date().toISOString()

    this.logger.debug('Context assembled', {
      itemCount: ordered.length,
      totalTokens,
      sourceCount,
      contextHash,
    })

    return {
      items: ordered,
      totalTokens,
      sourceCount,
      contextVersion,
      contextHash,
      assembledAt,
      entryNodeId: input.entryNodeId,
      workspaceId: input.workspaceId,
    }
  }

  private assembleItem(candidate: AssembleCandidateInput): ContextItem {
    const priority = this.assignPriority(candidate)
    const source: ContextSource = {
      nodeId: candidate.id,
      organizationId: candidate.organizationId,
      departmentId: candidate.departmentId,
      workspaceId: candidate.workspaceId,
      version: candidate.version,
    }

    return {
      id: candidate.id,
      nodeId: candidate.id,
      title: candidate.title,
      content: candidate.content,
      type: candidate.type,
      importance: candidate.importance,
      distance: candidate.distance,
      priority,
      compressionHint: candidate.compressionHint,
      inclusionReason: candidate.inclusionReason,
      complianceTags: [...candidate.complianceTags],
      source,
      tokens: candidate.tokens,
      rank: candidate.rank,
    }
  }

  private assignPriority(candidate: AssembleCandidateInput): ContextPriority {
    if (candidate.importance >= CRITICAL_IMPORTANCE_THRESHOLD) {
      return 'CRITICAL'
    }
    if (candidate.importance >= HIGH_IMPORTANCE_THRESHOLD) {
      return 'HIGH'
    }
    if (candidate.distance <= NEAR_DISTANCE_THRESHOLD) {
      return 'NORMAL'
    }
    return 'LOW'
  }

  private orderDeterministically(items: readonly ContextItem[]): ContextItem[] {
    return [...items].sort((a, b) => {
      // 1. Entry node first (distance 0)
      if (a.distance === 0 && b.distance !== 0) return -1
      if (b.distance === 0 && a.distance !== 0) return 1

      // 2. Priority tier descending
      const priorityOrder: Record<ContextPriority, number> = {
        CRITICAL: 0,
        HIGH: 1,
        NORMAL: 2,
        LOW: 3,
      }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }

      // 3. Rank ascending (lower rank = higher priority)
      if (a.rank !== b.rank) return a.rank - b.rank

      // 4. Importance descending
      if (a.importance !== b.importance) return b.importance - a.importance

      // 5. Distance ascending
      if (a.distance !== b.distance) return a.distance - b.distance

      // 6. Title alphabetical (final tie-break)
      return a.title.localeCompare(b.title)
    })
  }

  private computeHash(items: readonly ContextItem[], version: string): string {
    const hasher = crypto.createHash('sha256')
    hasher.update(version)
    for (const item of items) {
      hasher.update(item.id)
      hasher.update(String(item.rank))
    }
    return hasher.digest('hex').slice(0, 16)
  }
}
