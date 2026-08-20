import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import type { IngestionJob } from '../domain/ingestion.types'
import { IngestionService } from '../services/ingestion.service'

/**
 * Ingestion Job Processor — processes ingestion jobs from BullMQ queue.
 *
 * Handles:
 * - EXTRACT: Extract content from document
 * - NORMALIZE: Normalize extracted content
 * - CHUNK: Chunk content for indexing
 * - METADATA: Extract metadata
 * - KNOWLEDGE: Create knowledge nodes
 * - GRAPH: Detect graph relationships
 * - EMBED: Generate embeddings
 * - INDEX: Index vectors
 * - PUBLISH: Publish document
 * - REPROCESS: Reprocess document
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Idempotent operations
 * - Error handling and status tracking
 */
@Processor('ingestion', {
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 1000,
  },
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name)

  constructor(private readonly ingestionService: IngestionService) {
    super()
  }

  async process(job: Job<IngestionJob>): Promise<void> {
    const { documentId, type } = job.data

    this.logger.debug('Processing ingestion job', {
      jobId: job.id,
      documentId,
      type,
      attempt: job.attemptsMade + 1,
    })

    try {
      // For now, process the entire document pipeline
      // In the future, we could split into individual stage processors
      await this.ingestionService.processDocument(documentId)

      this.logger.debug('Ingestion job completed', {
        jobId: job.id,
        documentId,
        type,
      })
    } catch (error) {
      this.logger.error('Ingestion job failed', {
        jobId: job.id,
        documentId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Re-throw to trigger retry
      throw error
    }
  }
}
