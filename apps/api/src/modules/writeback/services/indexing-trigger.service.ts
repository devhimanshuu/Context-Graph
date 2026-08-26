/* Indexing Trigger — enqueues published knowledge nodes for embedding.

After a proposal is approved/auto-approved and the knowledge node is published,
this service triggers the existing RetrievalModule indexing pipeline:

  Published KnowledgeNode
    ↓
  IndexingService.indexNode()
    ↓
  BullMQ Queue → IndexingProcessor
    ↓
  Chunk → Embed → Store Vectors
    ↓
  Node becomes searchable via resolve_context

The trigger is fire-and-forget: indexing happens asynchronously via BullMQ.
The node is immediately available for graph traversal but not yet for
semantic search until the embedding pipeline completes. */

import { Inject, Injectable, Logger } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IIndexingService } from '../../retrieval/domain/retrieval.interfaces'

@Injectable()
export class IndexingTriggerService {
  private readonly logger = new Logger(IndexingTriggerService.name)

  constructor(@Inject(IIndexingService) private readonly indexingService: IIndexingService) {}

  /**
   * Trigger indexing for a newly published knowledge node.
   * This is a non-blocking call — the actual indexing happens via BullMQ.
   */
  async triggerIndexing(
    nodeId: EntityId,
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void> {
    try {
      this.logger.debug('Triggering indexing for published node', {
        nodeId,
        organizationId,
      })

      await this.indexingService.indexNode(nodeId, organizationId, workspaceId)

      this.logger.debug('Indexing triggered successfully', { nodeId })
    } catch (error) {
      // Indexing failure should NOT block the proposal flow.
      // The node is already published and graph-accessible.
      // Semantic search will be available once indexing succeeds on retry.
      this.logger.warn('Indexing trigger failed (non-blocking)', {
        nodeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Get the indexing status for a published node.
   */
  async getIndexStatus(nodeId: EntityId) {
    return this.indexingService.getIndexStatus(nodeId)
  }
}
