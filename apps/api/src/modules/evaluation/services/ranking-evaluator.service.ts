import { Injectable } from '@nestjs/common'
import { IRankingEvaluator } from '../domain/evaluation.interfaces'
import type { RankingMetrics } from '../domain/evaluation.types'

/**
 * Ranking Evaluator Service
 *
 * Evaluates the quality of candidate ranking:
 * - Ordering accuracy
 * - Top candidate accuracy
 * - Score consistency
 * - Tie-breaking consistency
 * - Mean rank of relevant items
 */
@Injectable()
export class RankingEvaluatorService extends IRankingEvaluator {
  /**
   * Evaluate ranking quality
   */
  evaluateRanking(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
    expectedRelevance: Readonly<Record<string, number>>,
  ): RankingMetrics {
    if (rankedCandidates.length === 0) {
      return this.getEmptyMetrics()
    }

    // Calculate ordering accuracy
    const orderingAccuracy = this.calculateOrderingAccuracy(rankedCandidates, expectedRelevance)

    // Calculate top candidate accuracy
    const topCandidateAccuracy = this.calculateTopCandidateAccuracy(
      rankedCandidates,
      expectedRelevance,
    )

    // Calculate score consistency
    const scoreConsistency = this.calculateScoreConsistency(rankedCandidates)

    // Calculate tie-breaking consistency
    const tieBreakingConsistency = this.calculateTieBreakingConsistency(rankedCandidates)

    // Calculate mean rank of relevant items
    const meanRankOfRelevant = this.calculateMeanRankOfRelevant(rankedCandidates, expectedRelevance)

    return {
      orderingAccuracy,
      topCandidateAccuracy,
      scoreConsistency,
      tieBreakingConsistency,
      meanRankOfRelevant,
    }
  }

  /**
   * Calculate ordering accuracy
   * Measures how well the ranking follows expected relevance ordering
   */
  private calculateOrderingAccuracy(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
    expectedRelevance: Readonly<Record<string, number>>,
  ): number {
    let correctOrderings = 0
    let totalOrderings = 0

    // Check pairwise ordering
    for (let i = 0; i < rankedCandidates.length; i++) {
      for (let j = i + 1; j < rankedCandidates.length; j++) {
        const candidateA = rankedCandidates[i]!
        const candidateB = rankedCandidates[j]!
        const relevanceA = expectedRelevance[candidateA.nodeId] || 0
        const relevanceB = expectedRelevance[candidateB.nodeId] || 0

        // If A is ranked higher than B, it should have higher relevance
        if (relevanceA >= relevanceB) {
          correctOrderings++
        }
        totalOrderings++
      }
    }

    return totalOrderings > 0 ? correctOrderings / totalOrderings : 0
  }

  /**
   * Calculate top candidate accuracy
   * Measures if the top-ranked candidate is the most relevant
   */
  private calculateTopCandidateAccuracy(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
    expectedRelevance: Readonly<Record<string, number>>,
  ): number {
    if (rankedCandidates.length === 0) {
      return 0
    }

    const topCandidate = rankedCandidates[0]!
    const topRelevance = expectedRelevance[topCandidate.nodeId] || 0

    // Find the maximum relevance score
    const maxRelevance = Math.max(...Object.values(expectedRelevance), 0)

    // If top candidate has maximum relevance, it's correct
    return topRelevance === maxRelevance ? 1 : 0
  }

  /**
   * Calculate score consistency
   * Measures how consistent the scores are with the ranking
   */
  private calculateScoreConsistency(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
  ): number {
    if (rankedCandidates.length <= 1) {
      return 1
    }

    let consistentPairs = 0
    let totalPairs = 0

    for (let i = 0; i < rankedCandidates.length; i++) {
      for (let j = i + 1; j < rankedCandidates.length; j++) {
        const candidateA = rankedCandidates[i]!
        const candidateB = rankedCandidates[j]!

        // If A is ranked higher than B, A should have higher or equal score
        if (candidateA.score >= candidateB.score) {
          consistentPairs++
        }
        totalPairs++
      }
    }

    return totalPairs > 0 ? consistentPairs / totalPairs : 0
  }

  /**
   * Calculate tie-breaking consistency
   * Measures how well ties are broken (same score should have consistent ordering)
   */
  private calculateTieBreakingConsistency(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
  ): number {
    if (rankedCandidates.length <= 1) {
      return 1
    }

    // Group candidates by score
    const scoreGroups = new Map<number, { nodeId: string; rank: number }[]>()
    for (const candidate of rankedCandidates) {
      const group = scoreGroups.get(candidate.score) || []
      group.push({ nodeId: candidate.nodeId, rank: candidate.rank })
      scoreGroups.set(candidate.score, group)
    }

    let consistentTies = 0
    let totalTies = 0

    // Check each group of tied candidates
    for (const group of scoreGroups.values()) {
      if (group.length <= 1) {
        continue
      }

      // Check if the ordering is consistent (by nodeId or other deterministic criteria)
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          // Simple deterministic ordering by nodeId
          const groupI = group[i]!
          const groupJ = group[j]!
          if (groupI.nodeId <= groupJ.nodeId) {
            consistentTies++
          }
          totalTies++
        }
      }
    }

    return totalTies > 0 ? consistentTies / totalTies : 1
  }

  /**
   * Calculate mean rank of relevant items
   * Lower is better (relevant items should appear earlier)
   */
  private calculateMeanRankOfRelevant(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
    expectedRelevance: Readonly<Record<string, number>>,
  ): number {
    let sumRank = 0
    let relevantCount = 0

    for (const candidate of rankedCandidates) {
      const relevance = expectedRelevance[candidate.nodeId] || 0
      if (relevance > 0) {
        sumRank += candidate.rank
        relevantCount++
      }
    }

    return relevantCount > 0 ? sumRank / relevantCount : rankedCandidates.length
  }

  /**
   * Aggregate ranking metrics across multiple cases
   */
  aggregateRankingMetrics(
    results: readonly {
      rankedCandidates: readonly { nodeId: string; score: number; rank: number }[]
      expectedRelevance: Readonly<Record<string, number>>
    }[],
  ): RankingMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    const aggregated = {
      orderingAccuracy: 0,
      topCandidateAccuracy: 0,
      scoreConsistency: 0,
      tieBreakingConsistency: 0,
      meanRankOfRelevant: 0,
    }

    for (const result of results) {
      const metrics = this.evaluateRanking(result.rankedCandidates, result.expectedRelevance)
      aggregated.orderingAccuracy += metrics.orderingAccuracy
      aggregated.topCandidateAccuracy += metrics.topCandidateAccuracy
      aggregated.scoreConsistency += metrics.scoreConsistency
      aggregated.tieBreakingConsistency += metrics.tieBreakingConsistency
      aggregated.meanRankOfRelevant += metrics.meanRankOfRelevant
    }

    const n = results.length
    return {
      orderingAccuracy: aggregated.orderingAccuracy / n,
      topCandidateAccuracy: aggregated.topCandidateAccuracy / n,
      scoreConsistency: aggregated.scoreConsistency / n,
      tieBreakingConsistency: aggregated.tieBreakingConsistency / n,
      meanRankOfRelevant: aggregated.meanRankOfRelevant / n,
    }
  }

  private getEmptyMetrics(): RankingMetrics {
    return {
      orderingAccuracy: 0,
      topCandidateAccuracy: 0,
      scoreConsistency: 0,
      tieBreakingConsistency: 0,
      meanRankOfRelevant: 0,
    }
  }
}
