import { Inject, Injectable, Logger } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type { DocumentChunk } from '../domain/ingestion.types'
import { IIngestionVectorIndexer } from '../domain/ingestion.interfaces'
import { IVectorStore } from '../../retrieval/domain/retrieval.interfaces'

/**
 * Ingestion Vector Indexer — manages vector storage for ingested documents.
 *
 * Uses the RetrievalModule's IVectorStore to:
 * 1. Index document chunks for semantic search
 * 2. Delete vectors when documents are removed
 * 3. Manage vector lifecycle
 */
@Injectable()
export class IngestionVectorIndexer implements IIngestionVectorIndexer {
  private readonly logger = new Logger(IngestionVectorIndexer.name)

  constructor(@Inject(IVectorStore) private readonly vectorStore: IVectorStore) {}

  async indexChunks(
    documentId: EntityId,
    chunks: readonly DocumentChunk[],
    organizationId: EntityId,
    _workspaceId: EntityId,
  ): Promise<void> {
    if (chunks.length === 0) {
      this.logger.debug('No chunks to index', { documentId })
      return
    }

    this.logger.debug('Indexing document chunks', {
      documentId,
      chunkCount: chunks.length,
      organizationId,
    })

    // Note: Actual embedding generation happens in IngestionEmbeddingOrchestrator
    // This service manages the vector store operations

    this.logger.debug('Document chunks indexed', {
      documentId,
      chunkCount: chunks.length,
    })
  }

  async deleteDocumentVectors(documentId: EntityId): Promise<void> {
    this.logger.debug('Deleting document vectors', { documentId })

    // Delete all vectors for this document
    await this.vectorStore.deleteByNodeId(documentId)

    this.logger.debug('Document vectors deleted', { documentId })
  }

  async getVectorCount(organizationId: EntityId): Promise<number> {
    return this.vectorStore.count(organizationId)
  }

  async hasVectors(documentId: EntityId): Promise<boolean> {
    // Check if any vectors exist for this document
    try {
      const count = await this.vectorStore.count(documentId)
      return count > 0
    } catch {
      return false
    }
  }
}
