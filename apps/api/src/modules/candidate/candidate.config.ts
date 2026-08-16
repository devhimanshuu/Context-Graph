/**
 * Deterministic candidate ranking configuration.
 *
 * The score is a weighted linear combination of normalized signals (each in
 * 0..100 except the unbounded distance penalty):
 *
 *   score = wImportance  * importance
 *         + wSpecificity * specificity          (100 - derivability)
 *         + wFreshness   * freshness            (100 when no expiry, else time-proportional)
 *         + wRelevance   * relevance            (100 at distance 0, decaying per hop)
 *         - wDerivability* derivabilityPenalty  (the raw derivability score)
 *         - wDistance    * distancePenalty      (hop distance)
 *
 * All signals are derived from the node and the FIXED evaluation instant —
 * no clock reads, no randomness — so identical inputs score identically.
 */
export interface CandidateRankingWeights {
  readonly importance: number
  readonly specificity: number
  readonly freshness: number
  readonly relevance: number
  readonly derivability: number
  readonly distance: number
}

export interface CandidateRankingConfig {
  readonly weights: CandidateRankingWeights
  /** Window over which a node's remaining validity is considered fresh. */
  readonly freshnessHorizonDays: number
  /** Relevance points deducted per hop of distance from the entry node. */
  readonly relevanceDecayPerHop: number
  /** Hard ceiling on candidates in a context package. */
  readonly maxCandidates: number
}

export const DEFAULT_CANDIDATE_RANKING_CONFIG: CandidateRankingConfig = {
  weights: {
    importance: 1.0,
    specificity: 1.0,
    freshness: 0.5,
    relevance: 0.8,
    derivability: 0.5,
    distance: 2.0,
  },
  freshnessHorizonDays: 365,
  relevanceDecayPerHop: 20,
  maxCandidates: 30,
}
