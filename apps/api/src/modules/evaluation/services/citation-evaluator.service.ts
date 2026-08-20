import { Injectable } from '@nestjs/common'
import { ICitationEvaluator } from '../domain/evaluation.interfaces'
import type { CitationMetrics } from '../domain/evaluation.types'

/**
 * Citation Evaluator Service
 *
 * Evaluates citation quality:
 * - Citation Precision
 * - Citation Recall
 * - Citation Correctness
 * - Citation Completeness
 *
 * A citation is correct only if it refers to a source actually present in the provided context.
 */
@Injectable()
export class CitationEvaluatorService extends ICitationEvaluator {
  /**
   * Evaluate citation quality
   */
  evaluateCitations(
    responseText: string,
    citations: readonly { nodeId: string; claim: string; position: number }[],
    contextNodes: readonly { nodeId: string; content: string }[],
    expectedCitations: readonly { nodeId: string; expectedClaim: string }[],
  ): CitationMetrics {
    // Create maps for quick lookup
    const contextNodeMap = new Map(contextNodes.map((node) => [node.nodeId, node]))
    const expectedCitationMap = new Map(
      expectedCitations.map((citation) => [citation.nodeId, citation]),
    )

    // Validate citations against context
    const validCitations: string[] = []
    const invalidCitations: string[] = []

    for (const citation of citations) {
      if (contextNodeMap.has(citation.nodeId)) {
        validCitations.push(citation.nodeId)
      } else {
        invalidCitations.push(citation.nodeId)
      }
    }

    // Calculate precision
    const citationPrecision = citations.length > 0 ? validCitations.length / citations.length : 0

    // Calculate recall
    const expectedNodeIds = new Set(expectedCitations.map((c) => c.nodeId))
    const validCitationSet = new Set(validCitations)
    const missingExpected = [...expectedNodeIds].filter((nodeId) => !validCitationSet.has(nodeId))
    const citationRecall =
      expectedCitations.length > 0
        ? (expectedCitations.length - missingExpected.length) / expectedCitations.length
        : 0

    // Calculate correctness (citations that match expected claims)
    let correctCitations = 0
    for (const citation of citations) {
      const expected = expectedCitationMap.get(citation.nodeId)
      if (expected) {
        // Check if the claim matches or is semantically similar
        if (this.isClaimSimilar(citation.claim, expected.expectedClaim)) {
          correctCitations++
        }
      }
    }
    const citationCorrectness =
      validCitations.length > 0 ? correctCitations / validCitations.length : 0

    // Calculate completeness (how many expected citations are present and correct)
    const citationCompleteness =
      expectedCitations.length > 0 ? correctCitations / expectedCitations.length : 0

    // Count hallucinated citations (citations not in context)
    const hallucinatedCitations = invalidCitations.length

    return {
      citationPrecision,
      citationRecall,
      citationCorrectness,
      citationCompleteness,
      validCitations: validCitations.length,
      invalidCitations: invalidCitations.length,
      missingCitations: missingExpected.length,
      hallucinatedCitations,
    }
  }

  /**
   * Check if two claims are semantically similar
   */
  private isClaimSimilar(claimA: string, claimB: string): boolean {
    // Simple similarity check using word overlap
    const wordsA = new Set(claimA.toLowerCase().split(/\s+/))
    const wordsB = new Set(claimB.toLowerCase().split(/\s+/))

    const intersection = new Set([...wordsA].filter((word) => wordsB.has(word)))
    const union = new Set([...wordsA, ...wordsB])

    const similarity = union.size > 0 ? intersection.size / union.size : 0

    // Consider claims similar if overlap is > 50%
    return similarity > 0.5
  }

  /**
   * Extract citations from response text
   * Looks for patterns like [1], [2], [3] or (NodeId)
   */
  extractCitationsFromText(
    responseText: string,
  ): readonly { position: number; citation: string }[] {
    const citations: { position: number; citation: string }[] = []

    // Pattern 1: [1], [2], etc.
    const numberedPattern = /\[(\d+)\]/g
    let match: RegExpExecArray | null
    while ((match = numberedPattern.exec(responseText)) !== null) {
      if (match[1]) {
        citations.push({
          position: match.index,
          citation: match[1],
        })
      }
    }

    // Pattern 2: (NodeId)
    const nodePattern = /\(([A-Za-z0-9-]+)\)/g
    while ((match = nodePattern.exec(responseText)) !== null) {
      if (match[1]) {
        citations.push({
          position: match.index,
          citation: match[1],
        })
      }
    }

    return citations
  }

  /**
   * Validate citation references against context
   */
  validateCitationReferences(
    citations: readonly string[],
    contextNodes: readonly { nodeId: string; content: string }[],
  ): {
    valid: string[]
    invalid: string[]
  } {
    const contextNodeIds = new Set(contextNodes.map((node) => node.nodeId))
    const valid: string[] = []
    const invalid: string[] = []

    for (const citation of citations) {
      if (contextNodeIds.has(citation)) {
        valid.push(citation)
      } else {
        invalid.push(citation)
      }
    }

    return { valid, invalid }
  }

  /**
   * Aggregate citation metrics across multiple cases
   */
  aggregateCitationMetrics(
    results: readonly {
      responseText: string
      citations: readonly { nodeId: string; claim: string; position: number }[]
      contextNodes: readonly { nodeId: string; content: string }[]
      expectedCitations: readonly { nodeId: string; expectedClaim: string }[]
    }[],
  ): CitationMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    const aggregated = {
      citationPrecision: 0,
      citationRecall: 0,
      citationCorrectness: 0,
      citationCompleteness: 0,
      validCitations: 0,
      invalidCitations: 0,
      missingCitations: 0,
      hallucinatedCitations: 0,
    }

    for (const result of results) {
      const metrics = this.evaluateCitations(
        result.responseText,
        result.citations,
        result.contextNodes,
        result.expectedCitations,
      )
      aggregated.citationPrecision += metrics.citationPrecision
      aggregated.citationRecall += metrics.citationRecall
      aggregated.citationCorrectness += metrics.citationCorrectness
      aggregated.citationCompleteness += metrics.citationCompleteness
      aggregated.validCitations += metrics.validCitations
      aggregated.invalidCitations += metrics.invalidCitations
      aggregated.missingCitations += metrics.missingCitations
      aggregated.hallucinatedCitations += metrics.hallucinatedCitations
    }

    const n = results.length
    return {
      citationPrecision: aggregated.citationPrecision / n,
      citationRecall: aggregated.citationRecall / n,
      citationCorrectness: aggregated.citationCorrectness / n,
      citationCompleteness: aggregated.citationCompleteness / n,
      validCitations: aggregated.validCitations / n,
      invalidCitations: aggregated.invalidCitations / n,
      missingCitations: aggregated.missingCitations / n,
      hallucinatedCitations: aggregated.hallucinatedCitations / n,
    }
  }

  private getEmptyMetrics(): CitationMetrics {
    return {
      citationPrecision: 0,
      citationRecall: 0,
      citationCorrectness: 0,
      citationCompleteness: 0,
      validCitations: 0,
      invalidCitations: 0,
      missingCitations: 0,
      hallucinatedCitations: 0,
    }
  }
}
