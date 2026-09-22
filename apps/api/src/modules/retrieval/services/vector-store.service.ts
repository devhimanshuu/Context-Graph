import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'
import type {
  VectorRecord,
  VectorSearchQuery,
  VectorSearchResult,
  VectorSearchHit,
} from '../domain/retrieval.types'
import { IVectorStore } from '../domain/retrieval.interfaces'

/**
 * Vector Store Service — PostgreSQL + pgvector implementation.
 *
 * Uses pgvector extension for vector similarity search.
 * Supports cosine similarity for semantic search.
 *
 * Schema:
 * - vector_chunks table with embedding column (vector type)
 * - HNSW index for approximate nearest neighbor search
 * - Organization-scoped queries for tenant isolation
 */
@Injectable()
export class VectorStoreService implements IVectorStore {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject('PRISMA') private readonly prisma: Record<string, unknown>,
  ) {}

  async upsert(records: readonly VectorRecord[]): Promise<void> {
    if (records.length === 0) return

    this.logger.debug('Upserting vector records', { count: records.length })

    const prismaClient = this.prisma as {
      $transaction: (operations: unknown[]) => Promise<unknown>
      vectorChunk: { upsert: (args: unknown) => Promise<unknown> }
    }

    // Use transaction for atomicity
    await prismaClient.$transaction(
      records.map((record) =>
        prismaClient.vectorChunk.upsert({
          where: { chunkId: record.chunkId },
          create: {
            chunkId: record.chunkId,
            nodeId: record.nodeId,
            organizationId: record.organizationId,
            workspaceId: record.workspaceId,
            embedding: [...record.embedding],
            embeddingModel: record.embeddingModel,
            embeddingVersion: record.embeddingVersion,
            contentHash: record.contentHash,
            content: record.content,
            title: record.metadata.title,
            type: record.metadata.type,
            status: record.metadata.status,
            importance: record.metadata.importance,
            departmentId: record.metadata.departmentId,
            complianceTags: [...record.metadata.complianceTags],
            chunkIndex: record.metadata.chunkIndex,
            totalChunks: record.metadata.totalChunks,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          },
          update: {
            embedding: [...record.embedding],
            embeddingModel: record.embeddingModel,
            embeddingVersion: record.embeddingVersion,
            contentHash: record.contentHash,
            content: record.content,
            title: record.metadata.title,
            type: record.metadata.type,
            status: record.metadata.status,
            importance: record.metadata.importance,
            departmentId: record.metadata.departmentId,
            complianceTags: [...record.metadata.complianceTags],
            chunkIndex: record.metadata.chunkIndex,
            totalChunks: record.metadata.totalChunks,
            updatedAt: record.updatedAt,
          },
        }),
      ),
    )

    this.logger.debug('Vector records upserted', { count: records.length })
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult> {
    const startTime = Date.now()

    this.logger.debug('Vector search', {
      organizationId: query.organizationId,
      topK: query.topK,
    })

    const filters = query.filters ?? {}

    const prismaClient = this.prisma as {
      $queryRaw: (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => Promise<Record<string, unknown>[]>
    }

    // Build the search query with organization filtering. All filter values
    // are passed as bind parameters — never interpolated into SQL text.
    const results = await prismaClient.$queryRaw`
      SELECT 
        chunk_id,
        node_id,
        organization_id,
        workspace_id,
        embedding,
        embedding_model,
        embedding_version,
        content_hash,
        content,
        title,
        type,
        status,
        importance,
        department_id,
        compliance_tags,
        chunk_index,
        total_chunks,
        created_at,
        updated_at,
        1 - (embedding <=> ${query.embedding}::vector) as similarity
      FROM "VectorChunk"
      WHERE organization_id = ${query.organizationId}
        ${
          query.workspaceId
            ? prismaClient.$queryRaw`AND workspace_id = ${query.workspaceId}`
            : prismaClient.$queryRaw``
        }
        ${
          filters.nodeTypes !== undefined && filters.nodeTypes.length > 0
            ? prismaClient.$queryRaw`AND type IN (${Prisma.join(filters.nodeTypes)})`
            : prismaClient.$queryRaw``
        }
        ${
          filters.statuses !== undefined && filters.statuses.length > 0
            ? prismaClient.$queryRaw`AND status IN (${Prisma.join(filters.statuses)})`
            : prismaClient.$queryRaw``
        }
        ${
          filters.complianceTags !== undefined && filters.complianceTags.length > 0
            ? prismaClient.$queryRaw`AND compliance_tags && ARRAY[${Prisma.join(
                filters.complianceTags,
              )}]::text[]`
            : prismaClient.$queryRaw``
        }
        ${
          filters.departments !== undefined && filters.departments.length > 0
            ? prismaClient.$queryRaw`AND department_id IN (${Prisma.join(filters.departments)})`
            : prismaClient.$queryRaw``
        }
      ORDER BY embedding <=> ${query.embedding}::vector
      LIMIT ${query.topK}
    `

    const hits: VectorSearchHit[] = results.map((row, index) => ({
      record: this.mapRowToVectorRecord(row),
      similarity: Number(row.similarity),
      rank: index + 1,
    }))

    const queryTimeMs = Date.now() - startTime

    this.logger.debug('Vector search complete', {
      matches: hits.length,
      queryTimeMs,
    })

    return {
      records: hits,
      totalMatches: hits.length,
      queryTimeMs,
    }
  }

  async delete(chunkIds: readonly string[]): Promise<void> {
    if (chunkIds.length === 0) return

    this.logger.debug('Deleting vector records', { count: chunkIds.length })

    const prismaClient = this.prisma as {
      vectorChunk: {
        deleteMany: (args: { where: { chunkId: { in: string[] } } }) => Promise<unknown>
      }
    }
    await prismaClient.vectorChunk.deleteMany({
      where: { chunkId: { in: [...chunkIds] } },
    })
  }

  async deleteByNodeId(nodeId: EntityId): Promise<void> {
    this.logger.debug('Deleting vectors by node', { nodeId })

    const prismaClient = this.prisma as {
      vectorChunk: { deleteMany: (args: { where: { nodeId: string } }) => Promise<unknown> }
    }
    await prismaClient.vectorChunk.deleteMany({
      where: { nodeId },
    })
  }

  async deleteByOrganizationId(organizationId: EntityId): Promise<void> {
    this.logger.debug('Deleting vectors by organization', { organizationId })

    const prismaClient = this.prisma as {
      vectorChunk: { deleteMany: (args: { where: { organizationId: string } }) => Promise<unknown> }
    }
    await prismaClient.vectorChunk.deleteMany({
      where: { organizationId },
    })
  }

  async count(organizationId: EntityId): Promise<number> {
    const prismaClient = this.prisma as {
      vectorChunk: { count: (args: { where: { organizationId: string } }) => Promise<number> }
    }
    return prismaClient.vectorChunk.count({
      where: { organizationId },
    })
  }

  async getById(chunkId: string): Promise<VectorRecord | null> {
    const prismaClient = this.prisma as {
      vectorChunk: {
        findUnique: (args: {
          where: { chunkId: string }
        }) => Promise<Record<string, unknown> | null>
      }
    }
    const record = await prismaClient.vectorChunk.findUnique({
      where: { chunkId },
    })

    if (!record) return null

    return this.mapRowToVectorRecord(record)
  }

  private mapRowToVectorRecord(row: Record<string, unknown>): VectorRecord {
    return {
      chunkId: row.chunk_id as string,
      nodeId: row.node_id as EntityId,
      organizationId: row.organization_id as EntityId,
      workspaceId: row.workspace_id as EntityId,
      embedding: row.embedding as number[],
      embeddingModel: row.embedding_model as string,
      embeddingVersion: row.embedding_version as string,
      contentHash: row.content_hash as string,
      content: row.content as string,
      metadata: {
        title: row.title as string,
        type: row.type as string,
        status: row.status as string,
        importance: Number(row.importance),
        departmentId: row.department_id as EntityId | null,
        complianceTags: row.compliance_tags as string[],
        chunkIndex: Number(row.chunk_index),
        totalChunks: Number(row.total_chunks),
      },
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
