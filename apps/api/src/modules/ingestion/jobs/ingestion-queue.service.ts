import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { Queue, Job } from 'bullmq'
import type { EntityId } from '@contextgraph/types'
import type { IngestionJob, IngestionJobStatus } from '../domain/ingestion.types'
import { IIngestionJobQueue } from '../domain/ingestion.interfaces'

/**
 * Ingestion Job Queue — manages ingestion jobs via BullMQ.
 *
 * Features:
 * - Job submission
 * - Job status tracking
 * - Job history
 * - Priority queues
 * - Delayed jobs
 */
@Injectable()
export class IngestionJobQueue implements IIngestionJobQueue {
  private readonly logger = new Logger(IngestionJobQueue.name)

  constructor(@InjectQueue('ingestion') private readonly queue: Queue) {}

  async addJob(
    job: Omit<IngestionJob, 'jobId' | 'status' | 'attempts' | 'createdAt'>,
  ): Promise<IngestionJob> {
    this.logger.debug('Adding ingestion job', {
      documentId: job.documentId,
      type: job.type,
    })

    const bullJob = await this.queue.add(
      job.type,
      {
        ...job,
      },
      {
        jobId: `ingestion-${job.documentId}-${Date.now()}`,
        attempts: job.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    )

    return {
      jobId: bullJob.id!,
      documentId: job.documentId,
      organizationId: job.organizationId,
      workspaceId: job.workspaceId,
      userId: job.userId,
      type: job.type,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: job.maxAttempts,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      metadata: job.metadata,
    }
  }

  async getJob(jobId: string): Promise<IngestionJob | null> {
    const job = await this.queue.getJob(jobId)
    if (!job) return null

    return {
      jobId: job.id!,
      documentId: job.data.documentId,
      organizationId: job.data.organizationId,
      workspaceId: job.data.workspaceId,
      userId: job.data.userId,
      type: job.data.type,
      status: await this.mapJobStatus(job),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 3,
      createdAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      error: job.failedReason ?? null,
      metadata: job.data.metadata,
    }
  }

  async getJobsByDocument(documentId: EntityId): Promise<IngestionJob[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'])
    const mappedJobs: IngestionJob[] = []

    for (const job of jobs) {
      if (job.data.documentId === documentId) {
        mappedJobs.push({
          jobId: job.id!,
          documentId: job.data.documentId,
          organizationId: job.data.organizationId,
          workspaceId: job.data.workspaceId,
          userId: job.data.userId,
          type: job.data.type,
          status: await this.mapJobStatus(job),
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 3,
          createdAt: new Date(job.timestamp).toISOString(),
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          error: job.failedReason ?? null,
          metadata: job.data.metadata,
        })
      }
    }

    return mappedJobs
  }

  async getJobsByOrganization(organizationId: EntityId): Promise<IngestionJob[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'])
    const mappedJobs: IngestionJob[] = []

    for (const job of jobs) {
      if (job.data.organizationId === organizationId) {
        mappedJobs.push({
          jobId: job.id!,
          documentId: job.data.documentId,
          organizationId: job.data.organizationId,
          workspaceId: job.data.workspaceId,
          userId: job.data.userId,
          type: job.data.type,
          status: await this.mapJobStatus(job),
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 3,
          createdAt: new Date(job.timestamp).toISOString(),
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          error: job.failedReason ?? null,
          metadata: job.data.metadata,
        })
      }
    }

    return mappedJobs
  }

  private async mapJobStatus(job: Job): Promise<IngestionJobStatus> {
    if (job.finishedOn && !job.failedReason) return 'COMPLETED'
    if (job.failedReason) return 'FAILED'
    if (await job.isActive()) return 'PROCESSING'
    return 'PENDING'
  }
}
