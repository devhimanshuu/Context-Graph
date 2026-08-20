import { Injectable } from '@nestjs/common'
import { IHallucinationDetector } from '../domain/evaluation.interfaces'

/**
 * Hallucination Detector Service
 *
 * Detects hallucinations in generated answers.
 *
 * Hallucination types:
 * 1. Unsupported factual claims
 * 2. Fabricated citations
 * 3. Invented entities or numbers
 * 4. Contradictions with context
 * 5. Over-generalizations
 *
 * Create adversarial questions whose answers are NOT present in the knowledge base.
 * Expected: No unsupported factual answer.
 * Measure: Unsupported Claim Rate or Hallucination Rate
 */
@Injectable()
export class HallucinationDetectorService implements IHallucinationDetector {
  /**
   * Detect hallucinations in answer
   */
  detectHallucinations(
    answer: string,
    context: readonly string[],
    query: string,
  ): {
    hallucinationRate: number
    unsupportedClaims: readonly { claim: string; reason: string }[]
    hallucinationDetected: boolean
  } {
    const unsupportedClaims: { claim: string; reason: string }[] = []

    // Extract claims from answer
    const claims = this.extractClaims(answer)

    // Check each claim against context
    for (const claim of claims) {
      const isSupported = this.isClaimSupported(claim, context)
      if (!isSupported) {
        const reason = this.determineHallucinationReason(claim, context, query)
        unsupportedClaims.push({ claim, reason })
      }
    }

    // Check for fabricated citations
    const citations = this.extractCitations(answer)
    for (const citation of citations) {
      if (!this.isCitationValid(citation, context)) {
        unsupportedClaims.push({
          claim: `Citation: ${citation}`,
          reason: 'Fabricated citation not found in context',
        })
      }
    }

    // Check for invented numbers or statistics
    const numbers = this.extractNumbers(answer)
    for (const number of numbers) {
      if (!this.isNumberInContext(number, context)) {
        unsupportedClaims.push({
          claim: `Number/Statistic: ${number}`,
          reason: 'Number not found in context',
        })
      }
    }

    // Check for contradictions
    const contradictions = this.detectContradictions(answer, context)
    for (const contradiction of contradictions) {
      unsupportedClaims.push({
        claim: contradiction.claim,
        reason: `Contradicts context: ${contradiction.contextSentence}`,
      })
    }

    const totalClaims = claims.length + citations.length + numbers.length
    const hallucinationRate = totalClaims > 0 ? unsupportedClaims.length / totalClaims : 0

    return {
      hallucinationRate,
      unsupportedClaims,
      hallucinationDetected: unsupportedClaims.length > 0,
    }
  }

  /**
   * Extract claims from answer
   */
  private extractClaims(answer: string): string[] {
    const claims: string[] = []
    const sentences = answer
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const sentence of sentences) {
      // Skip sentences that are questions or opinions
      if (
        sentence.endsWith('?') ||
        sentence.toLowerCase().startsWith('i think') ||
        sentence.toLowerCase().startsWith('in my opinion')
      ) {
        continue
      }

      // Extract factual claims
      if (this.isFactualClaim(sentence)) {
        claims.push(sentence)
      }
    }

    return claims
  }

  /**
   * Check if sentence is a factual claim
   */
  private isFactualClaim(sentence: string): boolean {
    const factualPatterns = [
      /\b(is|are|was|were|has|have|had|can|could|will|would|should|must)\b/i,
      /\b(\d+|percent|million|billion|thousand)\b/i,
      /\b(study|research|data|evidence|shows|indicates|proves)\b/i,
    ]

    return factualPatterns.some((pattern) => pattern.test(sentence))
  }

  /**
   * Check if claim is supported by context
   */
  private isClaimSupported(claim: string, context: readonly string[]): boolean {
    const claimLower = claim.toLowerCase()
    const claimWords = new Set(claimLower.split(/\s+/).filter((w) => w.length > 3))

    // Check each context chunk
    for (const chunk of context) {
      const chunkLower = chunk.toLowerCase()

      // Method 1: Direct substring match
      if (chunkLower.includes(claimLower)) {
        return true
      }

      // Method 2: Significant word overlap
      const chunkWords = new Set(chunkLower.split(/\s+/))
      const overlap = [...claimWords].filter((word) => chunkWords.has(word))

      if (claimWords.size > 0 && overlap.length / claimWords.size > 0.6) {
        return true
      }

      // Method 3: Semantic similarity (simplified)
      if (this.calculateSemanticSimilarity(claim, chunk) > 0.7) {
        return true
      }
    }

    return false
  }

  /**
   * Calculate semantic similarity (simplified)
   */
  private calculateSemanticSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/))
    const wordsB = new Set(textB.toLowerCase().split(/\s+/))

    const intersection = new Set([...wordsA].filter((word) => wordsB.has(word)))
    const union = new Set([...wordsA, ...wordsB])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Determine hallucination reason
   */
  private determineHallucinationReason(
    claim: string,
    context: readonly string[],
    _query: string,
  ): string {
    const claimLower = claim.toLowerCase()
    const contextText = context.join(' ').toLowerCase()

    // Check if claim is about something not in context
    if (contextText.length < claimLower.length) {
      return 'Claim is more detailed than available context'
    }

    // Check if claim contains specific numbers not in context
    const numberMatch = claimLower.match(/\d+/)
    if (numberMatch && !contextText.includes(numberMatch[0])) {
      return 'Claim contains specific number not found in context'
    }

    // Check if claim mentions entities not in context
    const entities = this.extractEntities(claim)
    for (const entity of entities) {
      if (!contextText.includes(entity.toLowerCase())) {
        return `Claim mentions entity "${entity}" not found in context`
      }
    }

    return 'Claim not supported by available context'
  }

  /**
   * Extract entities from text (simplified)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = []

    // Simple entity extraction: capitalized words
    const words = text.split(/\s+/)
    for (const word of words) {
      const firstChar = word?.[0]
      if (
        word &&
        word.length > 2 &&
        firstChar &&
        firstChar === firstChar.toUpperCase() &&
        word.slice(1) === word.slice(1).toLowerCase()
      ) {
        entities.push(word)
      }
    }

    return entities
  }

  /**
   * Extract citations from answer
   */
  private extractCitations(answer: string): string[] {
    const citations: string[] = []

    // Pattern 1: [1], [2], etc.
    const numberedPattern = /\[(\d+)\]/g
    let match: RegExpExecArray | null
    while ((match = numberedPattern.exec(answer)) !== null) {
      if (match[1]) {
        citations.push(match[1])
      }
    }

    // Pattern 2: (Source: ...)
    const sourcePattern = /\(Source:\s*([^)]+)\)/gi
    while ((match = sourcePattern.exec(answer)) !== null) {
      if (match[1]) {
        citations.push(match[1])
      }
    }

    return citations
  }

  /**
   * Check if citation is valid
   */
  private isCitationValid(citation: string, context: readonly string[]): boolean {
    // Check if citation appears in context
    for (const chunk of context) {
      if (chunk.includes(`[${citation}]`) || chunk.includes(`Source: ${citation}`)) {
        return true
      }
    }

    // Check if citation is a valid node ID format
    if (/^[A-Za-z0-9-]+$/.test(citation)) {
      return true // Allow valid node ID formats
    }

    return false
  }

  /**
   * Extract numbers from answer
   */
  private extractNumbers(answer: string): string[] {
    const numbers: string[] = []

    // Match numbers with optional units
    const numberPattern =
      /\b\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|percent|million|billion|thousand|USD|dollars))?\b/g
    let match
    while ((match = numberPattern.exec(answer)) !== null) {
      numbers.push(match[0])
    }

    return numbers
  }

  /**
   * Check if number is in context
   */
  private isNumberInContext(number: string, context: readonly string[]): boolean {
    const contextText = context.join(' ')
    return contextText.includes(number)
  }

  /**
   * Detect contradictions between answer and context
   */
  private detectContradictions(
    answer: string,
    context: readonly string[],
  ): readonly { claim: string; contextSentence: string }[] {
    const contradictions: { claim: string; contextSentence: string }[] = []

    const answerSentences = answer
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    const contextSentences = context
      .join(' ')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const answerSentence of answerSentences) {
      for (const contextSentence of contextSentences) {
        if (this.areContradictory(answerSentence, contextSentence)) {
          contradictions.push({
            claim: answerSentence,
            contextSentence,
          })
        }
      }
    }

    return contradictions
  }

  /**
   * Check if two sentences are contradictory
   */
  private areContradictory(sentenceA: string, sentenceB: string): boolean {
    const aLower = sentenceA.toLowerCase()
    const bLower = sentenceB.toLowerCase()

    // Check for negation patterns
    const negationPatterns = [
      [/\bis\b/, /\bis not\b|isn't\b/],
      [/\bare\b/, /\bare not\b|aren't\b/],
      [/\bhas\b/, /\bhas not\b|hasn't\b/],
      [/\bcan\b/, /\bcannot\b|can't\b/],
      [/\bwill\b/, /\bwill not\b|won't\b/],
    ]

    for (const [positive, negative] of negationPatterns) {
      if (
        positive &&
        negative &&
        ((positive.test(aLower) && negative.test(bLower)) ||
          (negative.test(aLower) && positive.test(bLower)))
      ) {
        // Check if they're talking about the same subject
        const wordsA = new Set(aLower.split(/\s+/))
        const wordsB = new Set(bLower.split(/\s+/))
        const overlap = [...wordsA].filter((word) => wordsB.has(word) && word.length > 3)

        if (overlap.length >= 2) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Aggregate hallucination detection across multiple cases
   */
  aggregateHallucinationResults(
    results: readonly {
      answer: string
      context: readonly string[]
      query: string
    }[],
  ): {
    hallucinationRate: number
    totalUnsupportedClaims: number
    hallucinationDetected: boolean
  } {
    let totalUnsupportedClaims = 0
    let totalClaims = 0

    for (const result of results) {
      const detection = this.detectHallucinations(result.answer, result.context, result.query)
      totalUnsupportedClaims += detection.unsupportedClaims.length
      totalClaims += detection.unsupportedClaims.length + (detection.hallucinationRate > 0 ? 1 : 0)
    }

    const hallucinationRate = totalClaims > 0 ? totalUnsupportedClaims / totalClaims : 0

    return {
      hallucinationRate,
      totalUnsupportedClaims,
      hallucinationDetected: totalUnsupportedClaims > 0,
    }
  }
}
