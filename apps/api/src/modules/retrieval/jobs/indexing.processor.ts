import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import type { IndexingJob } from '../domain/retrieval.types'
import { IndexingService } from '../services/indexing.service'

/**
 * Indexing Job Processor — processes indexing jobs from BullMQ queue.
 *
 * Handles:
 * - INDEX: Index a knowledge node
 * - REINDEX: Re-index a knowledge node
 * - DELETE: Delete vectors for a knowledge node
 * - UPDATE: Update vectors for a knowledge node
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Idempotent operations
 * - Error handling and status tracking
 */
@Processor('retrieval-indexing', {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name)

  constructor(private readonly indexingService: IndexingService) {
    super()
  }

  async process(job: Job<IndexingJob>): Promise<void> {
    const { nodeId, organizationId, workspaceId, type } = job.data

    this.logger.debug('Processing indexing job', {
      jobId: job.id,
      nodeId,
      type,
      attempt: job.attemptsMade + 1,
    })

    try {
      switch (type) {
        case 'INDEX':
        case 'REINDEX':
          await this.indexingService.processIndexingJob(job.data)
          break

        case 'DELETE':
          await this.indexingService.deleteNode(nodeId, organizationId)
          break

        case 'UPDATE':
          // Treat UPDATE as REINDEX
          await this.indexingService.reindexNode(nodeId, organizationId, workspaceId)
          break

        default:
          this.logger.warn('Unknown job type', { type })
      }

      this.logger.debug('Indexing job completed', {
        jobId: job.id,
        nodeId,
        type,
      })
    } catch (error) {
      this.logger.error('Indexing job failed', {
        jobId: job.id,
        nodeId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Re-throw to trigger retry
      throw error
    }
  }
}
