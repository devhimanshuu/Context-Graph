import { Inject, Injectable, Logger } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type { DocumentChunk } from '../domain/ingestion.types'
import { IIngestionEmbeddingOrchestrator } from '../domain/ingestion.interfaces'
import {
  IEmbeddingService,
  IVectorStore,
  IContentHasher,
} from '../../retrieval/domain/retrieval.interfaces'
import type { VectorRecord } from '../../retrieval/domain/retrieval.types'

/**
 * Ingestion Embedding Orchestrator — coordinates embedding generation
 * and vector indexing for ingested document chunks.
 *
 * Uses the RetrievalModule's IEmbeddingService and IVectorStore to:
 * 1. Generate embeddings for document chunks
 * 2. Store embeddings in pgvector for semantic search
 *
 * This integration ensures that ingested documents are immediately
 * searchable through the hybrid retrieval system.
 */
@Injectable()
export class IngestionEmbeddingOrchestrator implements IIngestionEmbeddingOrchestrator {
  private readonly logger = new Logger(IngestionEmbeddingOrchestrator.name)

  constructor(
    @Inject(IEmbeddingService) private readonly embeddingService: IEmbeddingService,
    @Inject(IVectorStore) private readonly vectorStore: IVectorStore,
    @Inject(IContentHasher) private readonly contentHasher: IContentHasher,
  ) {}

  async generateEmbeddings(
    documentId: EntityId,
    chunks: readonly DocumentChunk[],
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void> {
    if (chunks.length === 0) {
      this.logger.debug('No chunks to embed', { documentId })
      return
    }

    const startTime = Date.now()

    this.logger.debug('Generating embeddings for document chunks', {
      documentId,
      chunkCount: chunks.length,
      organizationId,
    })

    // Prepare texts for batch embedding
    const texts = chunks.map((chunk) => chunk.content)

    // Generate embeddings in batches
    const embeddingResponse = await this.embeddingService.generateEmbeddings({
      texts,
      model: this.embeddingService.getModel(),
    })

    this.logger.debug('Embeddings generated', {
      documentId,
      count: embeddingResponse.embeddings.length,
      dimensions: embeddingResponse.dimensions,
      latencyMs: Date.now() - startTime,
    })

    // Create vector records
    const vectorRecords: VectorRecord[] = chunks.map((chunk, index) => {
      const embedding = embeddingResponse.embeddings[index]
      if (!embedding) {
        throw new Error(`No embedding generated for chunk ${chunk.chunkId}`)
      }

      return {
        chunkId: chunk.chunkId,
        nodeId: documentId, // Use documentId as nodeId for document chunks
        organizationId,
        workspaceId,
        embedding,
        embeddingModel: this.embeddingService.getModel(),
        embeddingVersion: 'v1',
        contentHash: this.contentHasher.hash(chunk.content),
        content: chunk.content,
        metadata: {
          title: chunk.metadata.title,
          type: 'DOCUMENT_CHUNK',
          status: 'ACTIVE',
          importance: 50, // Default importance for document chunks
          departmentId: chunk.metadata.departmentId,
          complianceTags: [...chunk.metadata.tags],
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
        },
        createdAt: chunk.createdAt,
        updatedAt: new Date().toISOString(),
      }
    })

    // Upsert vector records
    await this.vectorStore.upsert(vectorRecords)

    this.logger.debug('Vector records stored', {
      documentId,
      count: vectorRecords.length,
      totalMs: Date.now() - startTime,
    })
  }
}
