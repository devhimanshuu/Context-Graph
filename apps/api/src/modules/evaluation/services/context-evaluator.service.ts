import { Injectable } from '@nestjs/common'
import { IContextEvaluator } from '../domain/evaluation.interfaces'
import type { ContextMetrics } from '../domain/evaluation.types'

/**
 * Context Evaluator Service
 *
 * Evaluates the quality of assembled context:
 * - Relevant context rate
 * - Irrelevant context rate
 * - Missing relevant context
 * - Context duplication
 * - Context diversity
 * - Budget utilization
 */
@Injectable()
export class ContextEvaluatorService extends IContextEvaluator {
  /**
   * Evaluate context quality
   */
  evaluateContext(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
    expectedRelevantNodes: readonly string[],
    budgetConstraints: { maxTokens: number; maxItems: number },
  ): ContextMetrics {
    if (contextItems.length === 0) {
      return this.getEmptyMetrics()
    }

    const expectedRelevantSet = new Set(expectedRelevantNodes)

    // Calculate relevant context rate
    const relevantItems = contextItems.filter(
      (item) => expectedRelevantSet.has(item.nodeId) || item.relevanceScore > 0.5,
    )
    const relevantContextRate = relevantItems.length / contextItems.length

    // Calculate irrelevant context rate
    const irrelevantItems = contextItems.filter(
      (item) => !expectedRelevantSet.has(item.nodeId) && item.relevanceScore <= 0.5,
    )
    const irrelevantContextRate = irrelevantItems.length / contextItems.length

    // Calculate missing relevant context
    const retrievedNodeIds = new Set(contextItems.map((item) => item.nodeId))
    const missingRelevant = expectedRelevantNodes.filter((nodeId) => !retrievedNodeIds.has(nodeId))
    const missingRelevantContext =
      missingRelevant.length / Math.max(expectedRelevantNodes.length, 1)

    // Calculate context duplication
    const duplicationRate = this.calculateDuplicationRate(contextItems)

    // Calculate context diversity
    const diversityScore = this.calculateDiversityScore(contextItems)

    // Calculate budget utilization
    const tokenEstimate = this.estimateTotalTokens(contextItems)
    const budgetUtilization = tokenEstimate / budgetConstraints.maxTokens

    // Calculate average context size
    const averageContextSize =
      contextItems.reduce((sum, item) => sum + item.content.length, 0) / contextItems.length

    return {
      relevantContextRate,
      irrelevantContextRate,
      missingRelevantContext,
      contextDuplication: duplicationRate,
      contextDiversity: diversityScore,
      budgetUtilization: Math.min(budgetUtilization, 1), // Cap at 1
      averageContextSize,
    }
  }

  /**
   * Calculate duplication rate
   * Measures how much content is duplicated across context items
   */
  private calculateDuplicationRate(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
  ): number {
    if (contextItems.length <= 1) {
      return 0
    }

    // Simple content similarity check using n-grams
    const ngramSize = 3
    const allNgrams = new Set<string>()
    const duplicateNgrams = new Set<string>()

    for (const item of contextItems) {
      const itemNgrams = this.extractNgrams(item.content, ngramSize)
      for (const ngram of itemNgrams) {
        if (allNgrams.has(ngram)) {
          duplicateNgrams.add(ngram)
        }
        allNgrams.add(ngram)
      }
    }

    return allNgrams.size > 0 ? duplicateNgrams.size / allNgrams.size : 0
  }

  /**
   * Calculate diversity score
   * Measures how diverse the context items are
   */
  private calculateDiversityScore(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
  ): number {
    if (contextItems.length <= 1) {
      return 1
    }

    // Calculate content similarity between items
    let totalSimilarity = 0
    let pairCount = 0

    for (let i = 0; i < contextItems.length; i++) {
      for (let j = i + 1; j < contextItems.length; j++) {
        const itemI = contextItems[i]!
        const itemJ = contextItems[j]!
        const similarity = this.calculateContentSimilarity(itemI.content, itemJ.content)
        totalSimilarity += similarity
        pairCount++
      }
    }

    const averageSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0
    // Diversity is inverse of similarity
    return 1 - averageSimilarity
  }

  /**
   * Calculate content similarity between two strings
   */
  private calculateContentSimilarity(a: string, b: string): number {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()

    // Simple Jaccard similarity using words
    const aWords = new Set(aLower.split(/\s+/))
    const bWords = new Set(bLower.split(/\s+/))

    const intersection = new Set([...aWords].filter((word) => bWords.has(word)))
    const union = new Set([...aWords, ...bWords])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Extract n-grams from text
   */
  private extractNgrams(text: string, n: number): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const ngrams: string[] = []

    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '))
    }

    return ngrams
  }

  /**
   * Estimate total tokens in context items
   */
  private estimateTotalTokens(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
  ): number {
    // Simple token estimation: ~4 characters per token
    const totalCharacters = contextItems.reduce((sum, item) => sum + item.content.length, 0)
    return Math.ceil(totalCharacters / 4)
  }

  /**
   * Aggregate context metrics across multiple cases
   */
  aggregateContextMetrics(
    results: readonly {
      contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[]
      expectedRelevantNodes: readonly string[]
      budgetConstraints: { maxTokens: number; maxItems: number }
    }[],
  ): ContextMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    const aggregated = {
      relevantContextRate: 0,
      irrelevantContextRate: 0,
      missingRelevantContext: 0,
      contextDuplication: 0,
      contextDiversity: 0,
      budgetUtilization: 0,
      averageContextSize: 0,
    }

    for (const result of results) {
      const metrics = this.evaluateContext(
        result.contextItems,
        result.expectedRelevantNodes,
        result.budgetConstraints,
      )
      aggregated.relevantContextRate += metrics.relevantContextRate
      aggregated.irrelevantContextRate += metrics.irrelevantContextRate
      aggregated.missingRelevantContext += metrics.missingRelevantContext
      aggregated.contextDuplication += metrics.contextDuplication
      aggregated.contextDiversity += metrics.contextDiversity
      aggregated.budgetUtilization += metrics.budgetUtilization
      aggregated.averageContextSize += metrics.averageContextSize
    }

    const n = results.length
    return {
      relevantContextRate: aggregated.relevantContextRate / n,
      irrelevantContextRate: aggregated.irrelevantContextRate / n,
      missingRelevantContext: aggregated.missingRelevantContext / n,
      contextDuplication: aggregated.contextDuplication / n,
      contextDiversity: aggregated.contextDiversity / n,
      budgetUtilization: aggregated.budgetUtilization / n,
      averageContextSize: aggregated.averageContextSize / n,
    }
  }

  private getEmptyMetrics(): ContextMetrics {
    return {
      relevantContextRate: 0,
      irrelevantContextRate: 0,
      missingRelevantContext: 0,
      contextDuplication: 0,
      contextDiversity: 0,
      budgetUtilization: 0,
      averageContextSize: 0,
    }
  }
}
