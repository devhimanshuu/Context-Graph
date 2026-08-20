import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'
import type {
  IndexStatus,
  IndexStatusRecord,
  IndexingJob,
  ChunkMetadata,
  VectorRecord,
} from '../domain/retrieval.types'
import {
  IChunker,
  IContentHasher,
  IEmbeddingService,
  IVectorStore,
  IIndexingJobQueue,
} from '../domain/retrieval.interfaces'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'

/**
 * Indexing Service — orchestrates the indexing pipeline for knowledge nodes.
 *
 * Pipeline:
 * Knowledge Node
 *   ↓
 * Validate
 *   ↓
 * Chunk
 *   ↓
 * Hash
 *   ↓
 * Generate Embeddings
 *   ↓
 * Store Vectors
 *   ↓
 * Mark Indexed
 *
 * Features:
 * - Async indexing via BullMQ
 * - Idempotent operations
 * - Content hash detection (skip unchanged)
 * - Embedding versioning
 * - Error recovery
 */
@Injectable()
export class IndexingService {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IKnowledgeRepository) private readonly knowledgeRepository: IKnowledgeRepository,
    @Inject(IChunker) private readonly chunker: IChunker,
    @Inject(IContentHasher) private readonly contentHasher: IContentHasher,
    @Inject(IEmbeddingService) private readonly embeddingService: IEmbeddingService,
    @Inject(IVectorStore) private readonly vectorStore: IVectorStore,
    @Inject(IIndexingJobQueue) private readonly jobQueue: IIndexingJobQueue,
    @Inject('PRISMA') private readonly prisma: Record<string, unknown>,
  ) {}

  async indexNode(
    nodeId: EntityId,
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void> {
    this.logger.debug('Queuing index job', { nodeId, organizationId })

    // Check if already indexed with same content
    const existingStatus = await this.getIndexStatus(nodeId)
    const node = await this.knowledgeRepository.findById(nodeId)

    if (!node) {
      this.logger.warn('Node not found for indexing', { nodeId })
      return
    }

    const contentHash = this.contentHasher.hash(node.content)

    // Skip if already indexed with same content
    if (existingStatus?.status === 'INDEXED' && existingStatus.contentHash === contentHash) {
      this.logger.debug('Node already indexed with same content', { nodeId })
      return
    }

    // Queue indexing job
    await this.jobQueue.addJob({
      nodeId,
      organizationId,
      workspaceId,
      type: 'INDEX',
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      error: null,
    })

    // Update status to QUEUED
    await this.updateIndexStatus(nodeId, 'QUEUED', {
      contentHash,
    })
  }

  async reindexNode(
    nodeId: EntityId,
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void> {
    this.logger.debug('Queuing reindex job', { nodeId, organizationId })

    // Delete existing vectors first
    await this.vectorStore.deleteByNodeId(nodeId)

    // Queue reindex job
    await this.jobQueue.addJob({
      nodeId,
      organizationId,
      workspaceId,
      type: 'REINDEX',
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      error: null,
    })

    // Update status to QUEUED
    await this.updateIndexStatus(nodeId, 'QUEUED')
  }

  async deleteNode(nodeId: EntityId, organizationId: EntityId): Promise<void> {
    this.logger.debug('Deleting node vectors', { nodeId, organizationId })

    // Delete all vectors for this node
    await this.vectorStore.deleteByNodeId(nodeId)

    // Update status to NOT_INDEXED
    await this.updateIndexStatus(nodeId, 'NOT_INDEXED')
  }

  async getIndexStatus(nodeId: EntityId): Promise<IndexStatusRecord | null> {
    const prisma = this.prisma as {
      indexStatus: {
        findUnique: (args: { where: { nodeId: string } }) => Promise<Record<string, unknown> | null>
      }
    }
    const record = await prisma.indexStatus.findUnique({
      where: { nodeId },
    })

    if (!record) return null

    return {
      nodeId: record.nodeId as string,
      status: record.status as IndexStatus,
      lastIndexedAt: record.lastIndexedAt as string | null,
      embeddingModel: record.embeddingModel as string | null,
      embeddingVersion: record.embeddingVersion as string | null,
      contentHash: record.contentHash as string | null,
      chunkCount: record.chunkCount as number,
      error: record.error as string | null,
      createdAt: record.createdAt as string,
      updatedAt: record.updatedAt as string,
    }
  }

  async getIndexStatusByOrganization(organizationId: EntityId): Promise<IndexStatusRecord[]> {
    const prisma = this.prisma as {
      indexStatus: {
        findMany: (args: {
          where: { organizationId: string }
        }) => Promise<Record<string, unknown>[]>
      }
    }
    const records = await prisma.indexStatus.findMany({
      where: { organizationId },
    })

    return records.map((record) => ({
      nodeId: record.nodeId as string,
      status: record.status as IndexStatus,
      lastIndexedAt: record.lastIndexedAt as string | null,
      embeddingModel: record.embeddingModel as string | null,
      embeddingVersion: record.embeddingVersion as string | null,
      contentHash: record.contentHash as string | null,
      chunkCount: record.chunkCount as number,
      error: record.error as string | null,
      createdAt: record.createdAt as string,
      updatedAt: record.updatedAt as string,
    }))
  }

  /**
   * Process a single indexing job.
   * Called by the BullMQ worker.
   */
  async processIndexingJob(job: IndexingJob): Promise<void> {
    const { nodeId, type } = job

    this.logger.debug('Processing indexing job', {
      jobId: job.jobId,
      nodeId,
      type,
    })

    try {
      // Update status to INDEXING
      await this.updateIndexStatus(nodeId, 'INDEXING')

      // Get the knowledge node
      const node = await this.knowledgeRepository.findById(nodeId)
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`)
      }

      // Calculate content hash
      const contentHash = this.contentHasher.hash(node.content)

      // Chunk the content
      const chunkMetadata: ChunkMetadata = {
        title: node.title,
        type: String(node.type),
        status: String(node.status),
        importance: node.importance,
        organizationId: node.organizationId,
        workspaceId: node.workspaceId,
        departmentId: node.departmentId,
        complianceTags: node.complianceTags,
      }

      const chunks = this.chunker.chunk(node.content, nodeId, chunkMetadata)

      // Generate embeddings for all chunks
      const embeddings = await this.embeddingService.generateEmbeddings({
        texts: chunks.map((chunk) => chunk.content),
        model: this.embeddingService.getModel(),
      })

      // Create vector records
      const vectorRecords: VectorRecord[] = chunks.map((chunk, index) => ({
        chunkId: chunk.chunkId,
        nodeId: chunk.nodeId,
        organizationId: chunk.metadata.organizationId,
        workspaceId: chunk.metadata.workspaceId,
        embedding: embeddings.embeddings[index] ?? [],
        embeddingModel: this.embeddingService.getModel(),
        embeddingVersion: 'v1',
        contentHash: chunk.contentHash,
        content: chunk.content,
        metadata: {
          title: chunk.metadata.title,
          type: chunk.metadata.type,
          status: chunk.metadata.status,
          importance: chunk.metadata.importance,
          departmentId: chunk.metadata.departmentId,
          complianceTags: chunk.metadata.complianceTags,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      // Store vectors
      await this.vectorStore.upsert(vectorRecords)

      // Update status to INDEXED
      await this.updateIndexStatus(nodeId, 'INDEXED', {
        lastIndexedAt: new Date().toISOString(),
        embeddingModel: this.embeddingService.getModel(),
        embeddingVersion: 'v1',
        contentHash,
        chunkCount: chunks.length,
      })

      this.logger.debug('Indexing complete', {
        nodeId,
        chunks: chunks.length,
        embeddings: embeddings.embeddings.length,
      })
    } catch (error) {
      this.logger.error('Indexing failed', {
        nodeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Update status to FAILED
      await this.updateIndexStatus(nodeId, 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  private async updateIndexStatus(
    nodeId: EntityId,
    status: IndexStatus,
    updates?: {
      lastIndexedAt?: string
      embeddingModel?: string
      embeddingVersion?: string
      contentHash?: string
      chunkCount?: number
      error?: string
    },
  ): Promise<void> {
    const data = {
      status,
      ...updates,
      updatedAt: new Date(),
    }

    const prisma = this.prisma as {
      indexStatus: {
        upsert: (args: {
          where: { nodeId: string }
          create: Record<string, unknown>
          update: Record<string, unknown>
        }) => Promise<unknown>
      }
    }
    await prisma.indexStatus.upsert({
      where: { nodeId },
      create: {
        nodeId,
        ...data,
        createdAt: new Date(),
      },
      update: data,
    })
  }
}
