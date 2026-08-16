import { Inject, Injectable } from '@nestjs/common'
import type { EntityId, Timestamp } from '@contextgraph/types'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import { type CandidateNode, type RankedCandidate } from '../domain/candidate-node'
import type { CandidateRankingConfig } from '../candidate.config'
import { CandidateRankingException } from '../errors/candidate-errors'

export interface RankCandidateSetInput {
  /** Built (unranked) candidates. */
  readonly candidates: readonly CandidateNode[]
  /** Anchors the package; the entry node ranks first regardless of score. */
  readonly entryNodeId: EntityId
  readonly config: CandidateRankingConfig
  /** Fixed evaluation instant — the only time source used by scoring. */
  readonly evaluatedAt: Timestamp
}

export interface RankCandidateSetResult {
  /** Ranked candidates (rank 1 first), capped at maxCandidates. */
  readonly candidates: readonly RankedCandidate[]
  /** True when candidates were dropped by the maxCandidates ceiling. */
  readonly truncated: boolean
}

export abstract class ICandidateRanker {
  abstract rank(input: RankCandidateSetInput): Promise<RankCandidateSetResult>
}

/**
 * Deterministic candidate ranker.
 *
 * Score model (see candidate.config.ts for weights and rationale):
 *   score = wImportance·importance + wSpecificity·specificity
 *         + wFreshness·freshness  + wRelevance·relevance
 *         - wDerivability·derivability - wDistance·distance
 *
 * Ordering (documented, stable):
 *   1. entry node first (it anchors the package);
 *   2. score descending;
 *   3. importance descending;
 *   4. distance ascending;
 *   5. node type ascending;
 *   6. node id ascending (final, total tie-break).
 *
 * No randomness, no clock reads (evaluatedAt is injected), no mutation of the
 * input — identical inputs produce identical rankings.
 */
@Injectable()
export class DeterministicCandidateRanker implements ICandidateRanker {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async rank(input: RankCandidateSetInput): Promise<RankCandidateSetResult> {
    this.assertConfig(input.config)

    const evaluatedMs = Date.parse(input.evaluatedAt)
    const scored = input.candidates.map((candidate) => ({
      candidate,
      score: this.score(candidate, input.config, evaluatedMs),
    }))

    const ordered = [...scored].sort((a, b) => {
      const aEntry = a.candidate.nodeId === input.entryNodeId ? 0 : 1
      const bEntry = b.candidate.nodeId === input.entryNodeId ? 0 : 1
      if (aEntry !== bEntry) return aEntry - bEntry
      if (b.score !== a.score) return b.score - a.score
      if (b.candidate.importance !== a.candidate.importance) {
        return b.candidate.importance - a.candidate.importance
      }
      if (a.candidate.distance !== b.candidate.distance) {
        return a.candidate.distance - b.candidate.distance
      }
      if (a.candidate.type !== b.candidate.type) {
        return a.candidate.type < b.candidate.type ? -1 : 1
      }
      return a.candidate.nodeId < b.candidate.nodeId ? -1 : 1
    })

    const truncated = ordered.length > input.config.maxCandidates
    const selected = ordered.slice(0, input.config.maxCandidates)

    const ranked: RankedCandidate[] = selected.map((entry, index) => ({
      ...entry.candidate,
      score: entry.score,
      rank: index + 1,
    }))

    this.logger.debug('Candidate set ranked', {
      entryNodeId: input.entryNodeId,
      scored: ordered.length,
      selected: ranked.length,
      truncated,
    })

    return { candidates: ranked, truncated }
  }

  /** All signals in 0..100 except the unbounded distance penalty. */
  private score(
    candidate: CandidateNode,
    config: CandidateRankingConfig,
    evaluatedMs: number,
  ): number {
    const { weights } = config
    const derivability = candidate.derivabilityScore ?? 50

    const specificity = 100 - derivability
    const freshness = this.freshness(candidate, config, evaluatedMs)
    const relevance = Math.max(0, 100 - candidate.distance * config.relevanceDecayPerHop)

    const score =
      weights.importance * candidate.importance +
      weights.specificity * specificity +
      weights.freshness * freshness +
      weights.relevance * relevance -
      weights.derivability * derivability -
      weights.distance * candidate.distance

    // Round to 4 decimals for stable, portable equality.
    return Math.round(score * 10_000) / 10_000
  }

  /** 100 when unbounded; otherwise the fraction of the horizon remaining. */
  private freshness(
    candidate: CandidateNode,
    config: CandidateRankingConfig,
    evaluatedMs: number,
  ): number {
    if (candidate.validTo === null) return 100
    const horizonMs = config.freshnessHorizonDays * 24 * 60 * 60 * 1000
    const remaining = Date.parse(candidate.validTo) - evaluatedMs
    if (remaining <= 0) return 0
    return Math.max(0, Math.min(100, (remaining / horizonMs) * 100))
  }

  private assertConfig(config: CandidateRankingConfig): void {
    const weights = Object.values(config.weights)
    if (weights.some((weight) => weight < 0 || !Number.isFinite(weight))) {
      throw new CandidateRankingException('Ranking weights must be finite and non-negative', {
        weights: config.weights,
      })
    }
    if (
      config.maxCandidates < 1 ||
      !Number.isInteger(config.maxCandidates) ||
      config.relevanceDecayPerHop <= 0
    ) {
      throw new CandidateRankingException('Ranking configuration is invalid', {
        maxCandidates: config.maxCandidates,
        relevanceDecayPerHop: config.relevanceDecayPerHop,
      })
    }
  }
}
