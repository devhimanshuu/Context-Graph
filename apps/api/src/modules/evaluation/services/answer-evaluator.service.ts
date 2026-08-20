import { Injectable } from '@nestjs/common'
import { IAnswerEvaluator } from '../domain/evaluation.interfaces'
import type { AnswerMetrics } from '../domain/evaluation.types'

/**
 * Answer Evaluator Service
 *
 * Evaluates answer quality:
 * - Relevance Score
 * - Groundedness Score
 * - Hallucination Rate
 * - Insufficient Context Rate
 * - Conflict Detection Rate
 * - Concept Coverage
 */
@Injectable()
export class AnswerEvaluatorService extends IAnswerEvaluator {
  /**
   * Evaluate answer quality
   */
  evaluateAnswer(
    answer: string,
    query: string,
    context: readonly string[],
    expectedCharacteristics: {
      mustContainConcepts: readonly string[]
      mustNotContainConcepts: readonly string[]
      minRelevanceScore: number
    },
  ): AnswerMetrics {
    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(answer, query, context)

    // Calculate groundedness score
    const groundednessScore = this.calculateGroundednessScore(answer, context)

    // Calculate hallucination rate
    const hallucinationRate = this.calculateHallucinationRate(answer, context)

    // Calculate insufficient context rate
    const insufficientContextRate = this.calculateInsufficientContextRate(answer, query, context)

    // Calculate conflict detection rate
    const conflictDetectionRate = this.calculateConflictDetectionRate(context)

    // Calculate concept coverage
    const conceptCoverage = this.calculateConceptCoverage(
      answer,
      expectedCharacteristics.mustContainConcepts,
      expectedCharacteristics.mustNotContainConcepts,
    )

    return {
      relevanceScore,
      groundednessScore,
      hallucinationRate,
      insufficientContextRate,
      conflictDetectionRate,
      conceptCoverage,
    }
  }

  /**
   * Calculate relevance score
   * Measures how well the answer addresses the query
   */
  private calculateRelevanceScore(
    answer: string,
    query: string,
    _context: readonly string[],
  ): number {
    const answerWords = new Set(answer.toLowerCase().split(/\s+/))
    const queryWords = new Set(query.toLowerCase().split(/\s+/))

    // Calculate word overlap between answer and query
    const intersection = new Set([...answerWords].filter((word) => queryWords.has(word)))
    const union = new Set([...answerWords, ...queryWords])

    const queryCoverage = union.size > 0 ? intersection.size / union.size : 0

    // Check if answer contains key terms from query
    let keyTermCount = 0
    for (const word of queryWords) {
      if (word.length > 3 && answer.toLowerCase().includes(word)) {
        keyTermCount++
      }
    }
    const keyTermCoverage = queryWords.size > 0 ? keyTermCount / queryWords.size : 0

    // Combine metrics
    return queryCoverage * 0.6 + keyTermCoverage * 0.4
  }

  /**
   * Calculate groundedness score
   * Measures how well the answer is supported by the context
   */
  private calculateGroundednessScore(answer: string, context: readonly string[]): number {
    if (context.length === 0) {
      return 0
    }

    const answerSentences = this.splitIntoSentences(answer)
    let groundedSentences = 0

    for (const sentence of answerSentences) {
      if (this.isSentenceGrounded(sentence, context)) {
        groundedSentences++
      }
    }

    return answerSentences.length > 0 ? groundedSentences / answerSentences.length : 0
  }

  /**
   * Calculate hallucination rate
   * Measures the proportion of unsupported claims
   */
  private calculateHallucinationRate(answer: string, context: readonly string[]): number {
    if (context.length === 0) {
      // If no context, any factual claim is potentially hallucinated
      return 1
    }

    const answerSentences = this.splitIntoSentences(answer)
    let ungroundedSentences = 0

    for (const sentence of answerSentences) {
      if (!this.isSentenceGrounded(sentence, context)) {
        ungroundedSentences++
      }
    }

    return answerSentences.length > 0 ? ungroundedSentences / answerSentences.length : 0
  }

  /**
   * Calculate insufficient context rate
   * Measures how often the answer indicates insufficient information
   */
  private calculateInsufficientContextRate(
    answer: string,
    query: string,
    context: readonly string[],
  ): number {
    const insufficientPhrases = [
      "i don't have enough information",
      'i cannot find',
      'the provided context does not',
      'insufficient information',
      'no relevant information',
      'not mentioned in the context',
      'cannot determine from the context',
    ]

    const answerLower = answer.toLowerCase()
    const hasInsufficientIndicator = insufficientPhrases.some((phrase) =>
      answerLower.includes(phrase),
    )

    // Check if context is actually insufficient
    const contextWords = new Set(context.join(' ').toLowerCase().split(/\s+/))
    const queryWords = new Set(query.toLowerCase().split(/\s+/))
    const overlap = [...queryWords].filter((word) => contextWords.has(word)).length
    const contextRelevance = queryWords.size > 0 ? overlap / queryWords.size : 0

    // If context is not relevant but answer doesn't indicate insufficiency
    if (contextRelevance < 0.3 && !hasInsufficientIndicator) {
      return 1
    }

    // If context is relevant but answer indicates insufficiency
    if (contextRelevance > 0.5 && hasInsufficientIndicator) {
      return 1
    }

    return 0
  }

  /**
   * Calculate conflict detection rate
   * Measures how well conflicts in context are detected
   */
  private calculateConflictDetectionRate(context: readonly string[]): number {
    if (context.length <= 1) {
      return 1 // No conflicts possible
    }

    // Simple conflict detection using negation patterns
    const conflictPatterns = [
      /\b(not|never|no|cannot|can't|don't|doesn't|won't|isn't|aren't)\b/i,
      /\b(always|every|all|never|none)\b/i,
    ]

    let potentialConflicts = 0
    for (let i = 0; i < context.length; i++) {
      for (let j = i + 1; j < context.length; j++) {
        const contextI = context[i]!
        const contextJ = context[j]!
        const hasConflict = conflictPatterns.some(
          (pattern) => pattern.test(contextI) && pattern.test(contextJ),
        )
        if (hasConflict) {
          potentialConflicts++
        }
      }
    }

    // Return 1 if no potential conflicts, otherwise scale down
    return potentialConflicts === 0
      ? 1
      : Math.max(0, 1 - potentialConflicts / ((context.length * (context.length - 1)) / 2))
  }

  /**
   * Calculate concept coverage
   * Measures how well the answer covers required concepts and avoids forbidden ones
   */
  private calculateConceptCoverage(
    answer: string,
    mustContainConcepts: readonly string[],
    mustNotContainConcepts: readonly string[],
  ): number {
    const answerLower = answer.toLowerCase()

    // Check required concepts
    let containedRequired = 0
    for (const concept of mustContainConcepts) {
      if (answerLower.includes(concept.toLowerCase())) {
        containedRequired++
      }
    }
    const requiredCoverage =
      mustContainConcepts.length > 0 ? containedRequired / mustContainConcepts.length : 1

    // Check forbidden concepts
    let containedForbidden = 0
    for (const concept of mustNotContainConcepts) {
      if (answerLower.includes(concept.toLowerCase())) {
        containedForbidden++
      }
    }
    const forbiddenAvoidance =
      mustNotContainConcepts.length > 0 ? 1 - containedForbidden / mustNotContainConcepts.length : 1

    // Combine metrics (weighted average)
    return requiredCoverage * 0.7 + forbiddenAvoidance * 0.3
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  /**
   * Check if a sentence is grounded in context
   */
  private isSentenceGrounded(sentence: string, context: readonly string[]): boolean {
    const sentenceWords = new Set(sentence.toLowerCase().split(/\s+/))
    const contextText = context.join(' ').toLowerCase()
    const contextWords = new Set(contextText.split(/\s+/))

    // Check word overlap
    const intersection = [...sentenceWords].filter(
      (word) => word.length > 3 && contextWords.has(word),
    )

    // If significant overlap, consider grounded
    return intersection.length >= 2
  }

  /**
   * Aggregate answer metrics across multiple cases
   */
  aggregateAnswerMetrics(
    results: readonly {
      answer: string
      query: string
      context: readonly string[]
      expectedCharacteristics: {
        mustContainConcepts: readonly string[]
        mustNotContainConcepts: readonly string[]
        minRelevanceScore: number
      }
    }[],
  ): AnswerMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    const aggregated = {
      relevanceScore: 0,
      groundednessScore: 0,
      hallucinationRate: 0,
      insufficientContextRate: 0,
      conflictDetectionRate: 0,
      conceptCoverage: 0,
    }

    for (const result of results) {
      const metrics = this.evaluateAnswer(
        result.answer,
        result.query,
        result.context,
        result.expectedCharacteristics,
      )
      aggregated.relevanceScore += metrics.relevanceScore
      aggregated.groundednessScore += metrics.groundednessScore
      aggregated.hallucinationRate += metrics.hallucinationRate
      aggregated.insufficientContextRate += metrics.insufficientContextRate
      aggregated.conflictDetectionRate += metrics.conflictDetectionRate
      aggregated.conceptCoverage += metrics.conceptCoverage
    }

    const n = results.length
    return {
      relevanceScore: aggregated.relevanceScore / n,
      groundednessScore: aggregated.groundednessScore / n,
      hallucinationRate: aggregated.hallucinationRate / n,
      insufficientContextRate: aggregated.insufficientContextRate / n,
      conflictDetectionRate: aggregated.conflictDetectionRate / n,
      conceptCoverage: aggregated.conceptCoverage / n,
    }
  }

  private getEmptyMetrics(): AnswerMetrics {
    return {
      relevanceScore: 0,
      groundednessScore: 0,
      hallucinationRate: 0,
      insufficientContextRate: 0,
      conflictDetectionRate: 0,
      conceptCoverage: 0,
    }
  }
}
