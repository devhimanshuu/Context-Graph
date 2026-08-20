import { Injectable } from '@nestjs/common'
import { IGroundednessEvaluator } from '../domain/evaluation.interfaces'

/**
 * Groundedness Evaluator Service
 *
 * Measures whether the answer is supported by the supplied context.
 *
 * Important distinction:
 * - Relevance: "Did the answer answer the question?"
 * - Groundedness: "Did the answer stay within the available evidence?"
 *
 * Both must be measured independently.
 */
@Injectable()
export class GroundednessEvaluatorService implements IGroundednessEvaluator {
  /**
   * Evaluate groundedness
   * Checks if claims in the answer are supported by context
   */
  evaluateGroundedness(
    answer: string,
    context: readonly string[],
    claims: readonly { claim: string; startIndex: number; endIndex: number }[],
  ): {
    groundedClaims: number
    ungroundedClaims: number
    groundednessScore: number
  } {
    if (claims.length === 0) {
      // If no specific claims, evaluate entire answer
      const isGrounded = this.isTextGrounded(answer, context)
      return {
        groundedClaims: isGrounded ? 1 : 0,
        ungroundedClaims: isGrounded ? 0 : 1,
        groundednessScore: isGrounded ? 1 : 0,
      }
    }

    let groundedClaims = 0
    let ungroundedClaims = 0

    for (const claim of claims) {
      if (this.isClaimGrounded(claim.claim, context)) {
        groundedClaims++
      } else {
        ungroundedClaims++
      }
    }

    const groundednessScore = claims.length > 0 ? groundedClaims / claims.length : 0

    return {
      groundedClaims,
      ungroundedClaims,
      groundednessScore,
    }
  }

  /**
   * Check if a claim is grounded in context
   */
  private isClaimGrounded(claim: string, context: readonly string[]): boolean {
    const claimLower = claim.toLowerCase()
    const claimWords = new Set(claimLower.split(/\s+/).filter((w) => w.length > 3))

    // Check each context chunk
    for (const chunk of context) {
      const chunkLower = chunk.toLowerCase()

      // Method 1: Direct substring match
      if (chunkLower.includes(claimLower)) {
        return true
      }

      // Method 2: Word overlap
      const chunkWords = new Set(chunkLower.split(/\s+/))
      const overlap = [...claimWords].filter((word) => chunkWords.has(word))

      // If significant overlap, consider grounded
      if (claimWords.size > 0 && overlap.length / claimWords.size > 0.6) {
        return true
      }

      // Method 3: Key phrase matching
      const keyPhrases = this.extractKeyPhrases(claim)
      const chunkPhrases = this.extractKeyPhrases(chunk)

      let matchedPhrases = 0
      for (const phrase of keyPhrases) {
        if (chunkPhrases.some((cp) => cp.includes(phrase) || phrase.includes(cp))) {
          matchedPhrases++
        }
      }

      if (keyPhrases.length > 0 && matchedPhrases / keyPhrases.length > 0.5) {
        return true
      }
    }

    return false
  }

  /**
   * Check if text is grounded in context
   */
  private isTextGrounded(text: string, context: readonly string[]): boolean {
    // Split text into sentences and check each
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (sentences.length === 0) {
      return true
    }

    let groundedSentences = 0
    for (const sentence of sentences) {
      if (this.isClaimGrounded(sentence, context)) {
        groundedSentences++
      }
    }

    // Consider grounded if majority of sentences are supported
    return groundedSentences / sentences.length > 0.5
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = []
    const words = text.split(/\s+/)

    // Extract 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`)
      if (i < words.length - 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
      }
    }

    return phrases
  }

  /**
   * Evaluate groundedness for multiple claims
   */
  evaluateClaimGroundedness(
    claims: readonly string[],
    context: readonly string[],
  ): {
    groundedClaims: string[]
    ungroundedClaims: string[]
    groundednessScore: number
  } {
    const groundedClaims: string[] = []
    const ungroundedClaims: string[] = []

    for (const claim of claims) {
      if (this.isClaimGrounded(claim, context)) {
        groundedClaims.push(claim)
      } else {
        ungroundedClaims.push(claim)
      }
    }

    const groundednessScore = claims.length > 0 ? groundedClaims.length / claims.length : 0

    return {
      groundedClaims,
      ungroundedClaims,
      groundednessScore,
    }
  }

  /**
   * Calculate groundedness with confidence intervals
   */
  calculateGroundednessWithConfidence(
    answers: readonly { answer: string; context: readonly string[] }[],
    confidenceLevel: number = 0.95,
  ): {
    meanGroundedness: number
    confidenceInterval: { lower: number; upper: number }
    standardError: number
  } {
    const groundednessScores: number[] = []

    for (const item of answers) {
      const sentences = item.answer
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      let grounded = 0
      for (const sentence of sentences) {
        if (this.isClaimGrounded(sentence, item.context)) {
          grounded++
        }
      }
      const score = sentences.length > 0 ? grounded / sentences.length : 0
      groundednessScores.push(score)
    }

    const n = groundednessScores.length
    if (n === 0) {
      return { meanGroundedness: 0, confidenceInterval: { lower: 0, upper: 0 }, standardError: 0 }
    }

    const mean = groundednessScores.reduce((a, b) => a + b, 0) / n
    const variance =
      groundednessScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n
    const standardDeviation = Math.sqrt(variance)
    const standardError = standardDeviation / Math.sqrt(n)

    // Z-score for 95% confidence interval
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645

    const marginOfError = zScore * standardError
    const lower = Math.max(0, mean - marginOfError)
    const upper = Math.min(1, mean + marginOfError)

    return {
      meanGroundedness: mean,
      confidenceInterval: { lower, upper },
      standardError,
    }
  }
}
