import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'
import type {
  RetrievalQuery,
  RetrievedCandidate,
  VectorSearchQuery,
  VectorSearchResult,
} from '../domain/retrieval.types'
import { ISemanticRetriever, IEmbeddingService, IVectorStore } from '../domain/retrieval.interfaces'

/**
 * Semantic Retriever — retrieves nodes via vector similarity search.
 *
 * Uses embeddings to find semantically similar content.
 * Applies organization-level filtering for tenant isolation.
 *
 * Security:
 * - Organization ID is always applied as a filter
 * - Results are not trusted until authorization is applied
 * - Similarity is a retrieval signal, not an authorization decision
 */
@Injectable()
export class SemanticRetriever extends ISemanticRetriever {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IEmbeddingService) private readonly embeddingService: IEmbeddingService,
    @Inject(IVectorStore) private readonly vectorStore: IVectorStore,
  ) {
    super()
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult> {
    return this.vectorStore.search(query)
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]> {
    const startTime = Date.now()

    this.logger.debug('Semantic retrieval', {
      organizationId: query.organizationId,
      workspaceId: query.workspaceId,
      topK: query.topK.semanticTopK,
      queryLength: query.userQuery.length,
    })

    try {
      // Generate embedding for the query
      const embeddingStart = Date.now()
      const embeddingResponse = await this.embeddingService.generateEmbeddings({
        texts: [query.userQuery],
        model: this.embeddingService.getModel(),
      })
      const embeddingLatencyMs = Date.now() - embeddingStart

      if (embeddingResponse.embeddings.length === 0) {
        this.logger.warn('No embedding generated for query')
        return []
      }

      const queryEmbedding = embeddingResponse.embeddings[0]

      // Search vector store with organization filtering
      const searchStart = Date.now()
      const searchResult = await this.vectorStore.search({
        embedding: queryEmbedding ?? [],
        organizationId: query.organizationId,
        workspaceId: query.workspaceId,
        topK: query.topK.semanticTopK,
        filters: {
          nodeTypes: query.filters.nodeTypes as string[] | undefined,
          statuses: query.filters.statuses as string[] | undefined,
          complianceTags: query.filters.complianceTags as string[] | undefined,
          departments: query.filters.departments as EntityId[] | undefined,
        },
        minSimilarity: query.configuration.minSimilarity,
      })
      const searchLatencyMs = Date.now() - searchStart

      // Convert to RetrievedCandidate format
      const candidates: RetrievedCandidate[] = searchResult.records.map((hit) => ({
        nodeId: hit.record.nodeId,
        title: hit.record.metadata.title,
        content: hit.record.content,
        type: hit.record.metadata.type,
        status: hit.record.metadata.status,
        importance: hit.record.metadata.importance,
        organizationId: hit.record.organizationId,
        departmentId: hit.record.metadata.departmentId,
        workspaceId: hit.record.workspaceId,
        complianceTags: [...hit.record.metadata.complianceTags],
        retrievalMethod: 'SEMANTIC' as const,
        graphDistance: null,
        semanticSimilarity: hit.similarity,
        lexicalScore: null,
        fusedScore: 0,
        rank: 0,
        explanation: {
          method: 'SEMANTIC' as const,
          graphDistance: null,
          semanticSimilarity: hit.similarity,
          lexicalScore: null,
          fusedRank: hit.rank,
          metadataMatches: [],
          authorizationResult: {
            allowed: true,
            reason: 'Semantic similarity',
            permissionLevel: null,
            complianceClearance: null,
          },
          ruleResult: null,
        },
      }))

      const latencyMs = Date.now() - startTime
      this.logger.debug('Semantic retrieval complete', {
        candidates: candidates.length,
        embeddingLatencyMs,
        searchLatencyMs,
        totalLatencyMs: latencyMs,
      })

      return candidates
    } catch (error) {
      this.logger.error('Semantic retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }
}
