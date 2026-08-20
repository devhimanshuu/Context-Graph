import { Injectable } from '@nestjs/common'
import { IRetrievalEvaluator } from '../domain/evaluation.interfaces'
import type { RetrievalMetrics } from '../domain/evaluation.types'

/**
 * Retrieval Evaluator Service
 *
 * Implements comprehensive retrieval quality metrics:
 * - Precision@K
 * - Recall@K
 * - Mean Reciprocal Rank (MRR)
 * - Normalized Discounted Cumulative Gain (NDCG)
 * - Hit Rate@K
 *
 * Formulas:
 *
 * Precision@K = (relevant items in top K) / K
 *
 * Recall@K = (relevant items in top K) / (total relevant items)
 *
 * MRR = 1 / rank of first relevant item
 *
 * NDCG@K = DCG@K / IDCG@K
 *   DCG@K = Σ(i=1 to K) (2^relevance_i - 1) / log2(i + 1)
 *   IDCG@K = DCG@K with ideal ordering
 *
 * Hit Rate@K = (cases with at least 1 relevant item in top K) / (total cases)
 */
@Injectable()
export class RetrievalEvaluatorService extends IRetrievalEvaluator {
  /**
   * Calculate Precision@K
   * Definition: relevant retrieved items / retrieved items
   */
  calculatePrecisionAtK(
    retrieved: readonly string[],
    relevant: readonly string[],
    k: number,
  ): number {
    if (k <= 0 || retrieved.length === 0) {
      return 0
    }

    const topK = retrieved.slice(0, k)
    const relevantSet = new Set(relevant)
    const relevantInTopK = topK.filter((nodeId) => relevantSet.has(nodeId))

    return relevantInTopK.length / Math.min(k, retrieved.length)
  }

  /**
   * Calculate Recall@K
   * Definition: relevant retrieved items / all relevant items
   */
  calculateRecallAtK(retrieved: readonly string[], relevant: readonly string[], k: number): number {
    if (k <= 0 || relevant.length === 0) {
      return 0
    }

    const topK = retrieved.slice(0, k)
    const relevantSet = new Set(relevant)
    const relevantInTopK = topK.filter((nodeId) => relevantSet.has(nodeId))

    return relevantInTopK.length / relevant.length
  }

  /**
   * Calculate Mean Reciprocal Rank (MRR)
   * Definition: 1 / rank of first relevant item
   * MRR = Σ(1/rank_i) / n, where rank_i is the rank of the first relevant item for query i
   */
  calculateMRR(retrieved: readonly string[], relevant: readonly string[]): number {
    if (relevant.length === 0 || retrieved.length === 0) {
      return 0
    }

    const relevantSet = new Set(relevant)

    for (let i = 0; i < retrieved.length; i++) {
      const node = retrieved[i]
      if (node !== undefined && relevantSet.has(node)) {
        return 1 / (i + 1)
      }
    }

    return 0
  }

  /**
   * Calculate Normalized Discounted Cumulative Gain (NDCG@K)
   *
   * DCG@K = Σ(i=1 to K) (2^relevance_i - 1) / log2(i + 1)
   * IDCG@K = DCG@K with ideal ordering (relevance sorted descending)
   * NDCG@K = DCG@K / IDCG@K
   */
  calculateNDCG(
    retrieved: readonly string[],
    relevanceScores: Readonly<Record<string, number>>,
    k: number,
  ): number {
    if (k <= 0 || retrieved.length === 0) {
      return 0
    }

    // Calculate DCG@K
    const dcg = this.calculateDCG(retrieved, relevanceScores, k)

    // Calculate IDCG@K (ideal ordering)
    const idealOrdering = Object.entries(relevanceScores)
      .sort(([, a], [, b]) => b - a)
      .map(([nodeId]) => nodeId)

    const idcg = this.calculateDCG(idealOrdering, relevanceScores, k)

    if (idcg === 0) {
      return 0
    }

    return dcg / idcg
  }

  /**
   * Calculate Hit Rate@K
   * Definition: cases with at least 1 relevant item in top K / total cases
   * Note: This is typically calculated across multiple cases, not for a single case
   */
  calculateHitRate(retrieved: readonly string[], relevant: readonly string[], k: number): number {
    if (k <= 0 || retrieved.length === 0) {
      return 0
    }

    const topK = retrieved.slice(0, k)
    const relevantSet = new Set(relevant)
    const hasRelevantInTopK = topK.some((nodeId) => relevantSet.has(nodeId))

    return hasRelevantInTopK ? 1 : 0
  }

  /**
   * Evaluate retrieval quality for a single case
   */
  evaluateRetrieval(
    retrievedNodes: readonly string[],
    expectedRelevantNodes: readonly string[],
    expectedExcludedNodes: readonly string[],
  ): RetrievalMetrics {
    // Calculate metrics at different K values
    const kValues = [1, 5, 10, 20]

    const precisionAtK: Record<number, number> = {}
    const recallAtK: Record<number, number> = {}

    for (const k of kValues) {
      precisionAtK[k] = this.calculatePrecisionAtK(retrievedNodes, expectedRelevantNodes, k)
      recallAtK[k] = this.calculateRecallAtK(retrievedNodes, expectedRelevantNodes, k)
    }

    // Calculate MRR
    const mrr = this.calculateMRR(retrievedNodes, expectedRelevantNodes)

    // Calculate NDCG (using binary relevance)
    const relevanceScores: Record<string, number> = {}
    for (const nodeId of expectedRelevantNodes) {
      relevanceScores[nodeId] = 1
    }
    for (const nodeId of expectedExcludedNodes) {
      relevanceScores[nodeId] = 0
    }

    const ndcgAt5 = this.calculateNDCG(retrievedNodes, relevanceScores, 5)
    const ndcgAt10 = this.calculateNDCG(retrievedNodes, relevanceScores, 10)

    // Calculate Hit Rate
    const hitRateAt5 = this.calculateHitRate(retrievedNodes, expectedRelevantNodes, 5)
    const hitRateAt10 = this.calculateHitRate(retrievedNodes, expectedRelevantNodes, 10)

    return {
      precisionAt1: precisionAtK[1] ?? 0,
      precisionAt5: precisionAtK[5] ?? 0,
      precisionAt10: precisionAtK[10] ?? 0,
      precisionAt20: precisionAtK[20] ?? 0,
      recallAt1: recallAtK[1] ?? 0,
      recallAt5: recallAtK[5] ?? 0,
      recallAt10: recallAtK[10] ?? 0,
      recallAt20: recallAtK[20] ?? 0,
      mrr,
      ndcgAt5,
      ndcgAt10,
      hitRateAt5,
      hitRateAt10,
    }
  }

  /**
   * Private helper to calculate DCG
   */
  private calculateDCG(
    retrieved: readonly string[],
    relevanceScores: Readonly<Record<string, number>>,
    k: number,
  ): number {
    let dcg = 0

    for (let i = 0; i < Math.min(k, retrieved.length); i++) {
      const node = retrieved[i]
      if (node !== undefined) {
        const relevance = relevanceScores[node] || 0
        dcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2) // i + 2 because log2(1) = 0
      }
    }

    return dcg
  }

  /**
   * Aggregate retrieval metrics across multiple cases
   */
  aggregateRetrievalMetrics(
    results: readonly {
      retrievedNodes: readonly string[]
      expectedRelevantNodes: readonly string[]
      expectedExcludedNodes: readonly string[]
    }[],
  ): RetrievalMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    const aggregated = {
      precisionAt1: 0,
      precisionAt5: 0,
      precisionAt10: 0,
      precisionAt20: 0,
      recallAt1: 0,
      recallAt5: 0,
      recallAt10: 0,
      recallAt20: 0,
      mrr: 0,
      ndcgAt5: 0,
      ndcgAt10: 0,
      hitRateAt5: 0,
      hitRateAt10: 0,
    }

    for (const result of results) {
      const metrics = this.evaluateRetrieval(
        result.retrievedNodes,
        result.expectedRelevantNodes,
        result.expectedExcludedNodes,
      )

      aggregated.precisionAt1 += metrics.precisionAt1
      aggregated.precisionAt5 += metrics.precisionAt5
      aggregated.precisionAt10 += metrics.precisionAt10
      aggregated.precisionAt20 += metrics.precisionAt20
      aggregated.recallAt1 += metrics.recallAt1
      aggregated.recallAt5 += metrics.recallAt5
      aggregated.recallAt10 += metrics.recallAt10
      aggregated.recallAt20 += metrics.recallAt20
      aggregated.mrr += metrics.mrr
      aggregated.ndcgAt5 += metrics.ndcgAt5
      aggregated.ndcgAt10 += metrics.ndcgAt10
      aggregated.hitRateAt5 += metrics.hitRateAt5
      aggregated.hitRateAt10 += metrics.hitRateAt10
    }

    const n = results.length
    return {
      precisionAt1: aggregated.precisionAt1 / n,
      precisionAt5: aggregated.precisionAt5 / n,
      precisionAt10: aggregated.precisionAt10 / n,
      precisionAt20: aggregated.precisionAt20 / n,
      recallAt1: aggregated.recallAt1 / n,
      recallAt5: aggregated.recallAt5 / n,
      recallAt10: aggregated.recallAt10 / n,
      recallAt20: aggregated.recallAt20 / n,
      mrr: aggregated.mrr / n,
      ndcgAt5: aggregated.ndcgAt5 / n,
      ndcgAt10: aggregated.ndcgAt10 / n,
      hitRateAt5: aggregated.hitRateAt5 / n,
      hitRateAt10: aggregated.hitRateAt10 / n,
    }
  }

  private getEmptyMetrics(): RetrievalMetrics {
    return {
      precisionAt1: 0,
      precisionAt5: 0,
      precisionAt10: 0,
      precisionAt20: 0,
      recallAt1: 0,
      recallAt5: 0,
      recallAt10: 0,
      recallAt20: 0,
      mrr: 0,
      ndcgAt5: 0,
      ndcgAt10: 0,
      hitRateAt5: 0,
      hitRateAt10: 0,
    }
  }
}
