import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { Queue, Job } from 'bullmq'
import type { EntityId } from '@contextgraph/types'
import type { IndexingJob, IndexingJobStatus } from '../domain/retrieval.types'
import type { IIndexingJobQueue } from '../domain/retrieval.interfaces'

/**
 * Indexing Job Queue — manages indexing jobs via BullMQ.
 *
 * Features:
 * - Job submission
 * - Job status tracking
 * - Job history
 * - Priority queues
 * - Delayed jobs
 */
@Injectable()
export class IndexingJobQueue implements IIndexingJobQueue {
  constructor(@InjectQueue('retrieval-indexing') private readonly queue: Queue) {}

  async addJob(
    job: Omit<IndexingJob, 'jobId' | 'status' | 'attempts' | 'createdAt'>,
  ): Promise<IndexingJob> {
    const bullJob = await this.queue.add(
      job.type,
      {
        ...job,
      },
      {
        jobId: `indexing-${job.nodeId}-${Date.now()}`,
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
      nodeId: job.nodeId,
      organizationId: job.organizationId,
      workspaceId: job.workspaceId,
      type: job.type,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: job.maxAttempts,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
    }
  }

  async getJob(jobId: string): Promise<IndexingJob | null> {
    const job = await this.queue.getJob(jobId)
    if (!job) return null

    return {
      jobId: job.id!,
      nodeId: job.data.nodeId,
      organizationId: job.data.organizationId,
      workspaceId: job.data.workspaceId,
      type: job.data.type,
      status: await this.mapJobStatus(job),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 3,
      createdAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      error: job.failedReason ?? null,
    }
  }

  async getJobsByNode(nodeId: EntityId): Promise<IndexingJob[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'])
    const mappedJobs: IndexingJob[] = []

    for (const job of jobs) {
      if (job.data.nodeId === nodeId) {
        mappedJobs.push({
          jobId: job.id!,
          nodeId: job.data.nodeId,
          organizationId: job.data.organizationId,
          workspaceId: job.data.workspaceId,
          type: job.data.type,
          status: await this.mapJobStatus(job),
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 3,
          createdAt: new Date(job.timestamp).toISOString(),
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          error: job.failedReason ?? null,
        })
      }
    }

    return mappedJobs
  }

  async getJobsByOrganization(organizationId: EntityId): Promise<IndexingJob[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'])
    const mappedJobs: IndexingJob[] = []

    for (const job of jobs) {
      if (job.data.organizationId === organizationId) {
        mappedJobs.push({
          jobId: job.id!,
          nodeId: job.data.nodeId,
          organizationId: job.data.organizationId,
          workspaceId: job.data.workspaceId,
          type: job.data.type,
          status: await this.mapJobStatus(job),
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 3,
          createdAt: new Date(job.timestamp).toISOString(),
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          error: job.failedReason ?? null,
        })
      }
    }

    return mappedJobs
  }

  private async mapJobStatus(job: Job): Promise<IndexingJobStatus> {
    if (job.finishedOn && !job.failedReason) return 'COMPLETED'
    if (job.failedReason) return 'FAILED'
    if (await job.isActive()) return 'PROCESSING'
    return 'PENDING'
  }
}
