import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type {
  RetrievalQuery,
  RetrievalResult,
  RetrievedCandidate,
  FusionMetadata,
  RetrievalMetrics,
} from '../domain/retrieval.types'
import {
  IHybridRetriever,
  IGraphRetriever,
  ISemanticRetriever,
  ILexicalRetriever,
} from '../domain/retrieval.interfaces'

/**
 * Hybrid Retriever — combines graph, semantic, and lexical retrieval.
 *
 * Uses Reciprocal Rank Fusion (RRF) to combine results from multiple
 * retrieval methods into a unified ranking.
 *
 * RRF Formula:
 * score(d) = Σ 1/(k + rank_i(d))
 * where:
 * - d = document
 * - k = constant (typically 60)
 * - rank_i(d) = rank of document d in result list i
 *
 * Architecture:
 * User Query
 *   ↓
 * ┌─────────────────┬─────────────────┬─────────────────┐
 * │ Graph Retrieval │ Semantic Search │ Lexical Search  │
 * └─────────────────┴─────────────────┴─────────────────┘
 *                   ↓
 *          Reciprocal Rank Fusion
 *                   ↓
 *           Final Ranking
 */
@Injectable()
export class HybridRetriever extends IHybridRetriever {
  private readonly RRF_K = 60 // Constant for RRF formula

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IGraphRetriever) private readonly graphRetriever: IGraphRetriever,
    @Inject(ISemanticRetriever) private readonly semanticRetriever: ISemanticRetriever,
    @Inject(ILexicalRetriever) private readonly lexicalRetriever: ILexicalRetriever,
  ) {
    super()
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now()

    this.logger.debug('Hybrid retrieval', {
      mode: query.mode,
      organizationId: query.organizationId,
    })

    // Parallel retrieval from all enabled sources
    const retrievalPromises: Promise<RetrievedCandidate[]>[] = []
    const retrievalStartTimes: Record<string, number> = {}

    if (query.configuration.enableGraph) {
      retrievalStartTimes.graph = Date.now()
      retrievalPromises.push(
        this.graphRetriever.retrieve(query).catch((error) => {
          this.logger.error('Graph retrieval failed', { error })
          return []
        }),
      )
    }

    if (query.configuration.enableSemantic) {
      retrievalStartTimes.semantic = Date.now()
      retrievalPromises.push(
        this.semanticRetriever.retrieve(query).catch((error) => {
          this.logger.error('Semantic retrieval failed', { error })
          return []
        }),
      )
    }

    if (query.configuration.enableLexical) {
      retrievalStartTimes.lexical = Date.now()
      retrievalPromises.push(
        this.lexicalRetriever.retrieve(query).catch((error) => {
          this.logger.error('Lexical retrieval failed', { error })
          return []
        }),
      )
    }

    const results = await Promise.all(retrievalPromises)

    // Unpack results based on enabled modes
    let graphResults: RetrievedCandidate[] = []
    let semanticResults: RetrievedCandidate[] = []
    let lexicalResults: RetrievedCandidate[] = []

    let resultIndex = 0
    if (query.configuration.enableGraph) {
      graphResults = results[resultIndex] ?? []
      resultIndex++
    }
    if (query.configuration.enableSemantic) {
      semanticResults = results[resultIndex] ?? []
      resultIndex++
    }
    if (query.configuration.enableLexical) {
      lexicalResults = results[resultIndex] ?? []
      resultIndex++
    }

    // Fuse results using RRF
    const fusionStart = Date.now()
    const fusedCandidates = this.fuseResults(graphResults, semanticResults, lexicalResults, {
      graph: query.configuration.graphWeight,
      semantic: query.configuration.semanticWeight,
      lexical: query.configuration.lexicalWeight,
    })
    const fusionLatencyMs = Date.now() - fusionStart

    // Apply final topK limit
    const finalCandidates = fusedCandidates.slice(0, query.topK.finalTopK)

    // Assign final ranks
    const rankedCandidates = finalCandidates.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      explanation: {
        ...candidate.explanation,
        fusedRank: index + 1,
      },
    }))

    const totalLatencyMs = Date.now() - startTime

    // Build fusion metadata
    const fusionMetadata: FusionMetadata = {
      strategy: 'RRF',
      graphWeight: query.configuration.graphWeight,
      semanticWeight: query.configuration.semanticWeight,
      lexicalWeight: query.configuration.lexicalWeight,
      totalCandidates: graphResults.length + semanticResults.length + lexicalResults.length,
      fusedCandidates: fusedCandidates.length,
    }

    // Build metrics
    const metrics: RetrievalMetrics = {
      queryLatencyMs: totalLatencyMs,
      embeddingLatencyMs: retrievalStartTimes.semantic
        ? Date.now() - retrievalStartTimes.semantic
        : 0,
      vectorSearchLatencyMs: retrievalStartTimes.semantic
        ? Date.now() - retrievalStartTimes.semantic
        : 0,
      lexicalSearchLatencyMs: retrievalStartTimes.lexical
        ? Date.now() - retrievalStartTimes.lexical
        : 0,
      graphRetrievalLatencyMs: retrievalStartTimes.graph
        ? Date.now() - retrievalStartTimes.graph
        : 0,
      fusionLatencyMs,
      authorizationLatencyMs: 0, // Will be filled by caller
      ruleFilteringLatencyMs: 0, // Will be filled by caller
      finalCandidateCount: rankedCandidates.length,
      cacheHitRate: 0, // Will be filled by cache layer
    }

    this.logger.debug('Hybrid retrieval complete', {
      graphResults: graphResults.length,
      semanticResults: semanticResults.length,
      lexicalResults: lexicalResults.length,
      fusedCandidates: fusedCandidates.length,
      finalCandidates: rankedCandidates.length,
      totalLatencyMs,
    })

    return {
      candidates: rankedCandidates,
      mode: query.mode,
      totalResults: rankedCandidates.length,
      graphResults,
      semanticResults,
      lexicalResults,
      fusionMetadata,
      metrics,
    }
  }

  /**
   * Fuse results using Reciprocal Rank Fusion (RRF).
   *
   * Formula: score(d) = Σ w_i * 1/(k + rank_i(d))
   *
   * where:
   * - d = document/candidate
   * - k = constant (60, standard value from literature)
   * - w_i = weight for retrieval method i
   * - rank_i(d) = rank of document d in result list i (1-indexed)
   */
  fuseResults(
    graphResults: readonly RetrievedCandidate[],
    semanticResults: readonly RetrievedCandidate[],
    lexicalResults: readonly RetrievedCandidate[],
    weights: { graph: number; semantic: number; lexical: number },
  ): readonly RetrievedCandidate[] {
    // Build a map of nodeId -> candidate scores
    const candidateScores = new Map<string, { candidate: RetrievedCandidate; score: number }>()

    // Process graph results
    graphResults.forEach((candidate, index) => {
      const rank = index + 1
      const rrfScore = weights.graph / (this.RRF_K + rank)
      const existing = candidateScores.get(candidate.nodeId)
      if (existing) {
        existing.score += rrfScore
      } else {
        candidateScores.set(candidate.nodeId, { candidate, score: rrfScore })
      }
    })

    // Process semantic results
    semanticResults.forEach((candidate, index) => {
      const rank = index + 1
      const rrfScore = weights.semantic / (this.RRF_K + rank)
      const existing = candidateScores.get(candidate.nodeId)
      if (existing) {
        existing.score += rrfScore
      } else {
        candidateScores.set(candidate.nodeId, { candidate, score: rrfScore })
      }
    })

    // Process lexical results
    lexicalResults.forEach((candidate, index) => {
      const rank = index + 1
      const rrfScore = weights.lexical / (this.RRF_K + rank)
      const existing = candidateScores.get(candidate.nodeId)
      if (existing) {
        existing.score += rrfScore
      } else {
        candidateScores.set(candidate.nodeId, { candidate, score: rrfScore })
      }
    })

    // Sort by fused score (descending)
    const sortedCandidates = Array.from(candidateScores.values())
      .sort((a, b) => b.score - a.score)
      .map((item) => ({
        ...item.candidate,
        fusedScore: item.score,
      }))

    return sortedCandidates
  }
}
