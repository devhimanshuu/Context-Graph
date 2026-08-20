import { Inject, Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { EntityId } from '@contextgraph/types'
import type {
  Document,
  DocumentIngestionRequest,
  DocumentStatus,
  DocumentChunk,
  ExtractedDocument,
  NormalizedContent,
  IngestedKnowledgeNode,
  IngestedGraphRelationship,
  IngestionPipelineResult,
  IngestionStageResult,
  ContentType,
} from '../domain/ingestion.types'
import {
  DocumentStatus as DocStatus,
  IngestionStage,
  IngestionStageStatus,
} from '../domain/ingestion.types'
import {
  IDocumentRepository,
  IObjectStorage,
  IFileValidator,
  IFileSecurityScanner,
  IContentExtractor,
  IContentNormalizer,
  IDocumentChunker,
  IMetadataExtractor,
  IKnowledgeNodeCreator,
  IGraphRelationshipDetector,
  IIngestionEmbeddingOrchestrator,
  IIngestionVectorIndexer,
  IIngestionJobQueue,
  IIngestionService,
} from '../domain/ingestion.interfaces'
import { uuid } from '../../../common/utils/uuid'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { ValidationException } from '../../../common/exceptions/validation.exception'

/**
 * Ingestion Service — orchestrates the document ingestion pipeline.
 *
 * Pipeline:
 * Upload/Import
 *   ↓
 * Validation
 *   ↓
 * Storage
 *   ↓
 * Content Extraction
 *   ↓
 * Normalization
 *   ↓
 * Chunking
 *   ↓
 * Metadata Extraction
 *   ↓
 * Knowledge Node Creation
 *   ↓
 * Graph Relationship Detection
 *   ↓
 * Embedding Generation
 *   ↓
 * Vector Indexing
 *   ↓
 * Validation
 *   ↓
 * Published Knowledge
 *
 * The API performs lightweight operations and queues expensive work via BullMQ.
 */
@Injectable()
export class IngestionService implements IIngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    @Inject(IDocumentRepository) private readonly documentRepository: IDocumentRepository,
    @Inject(IObjectStorage) private readonly objectStorage: IObjectStorage,
    @Inject(IFileValidator) private readonly fileValidator: IFileValidator,
    @Inject(IFileSecurityScanner) private readonly securityScanner: IFileSecurityScanner,
    @Inject(IContentExtractor) private readonly contentExtractor: IContentExtractor,
    @Inject(IContentNormalizer) private readonly contentNormalizer: IContentNormalizer,
    @Inject(IDocumentChunker) private readonly documentChunker: IDocumentChunker,
    @Inject(IMetadataExtractor) private readonly metadataExtractor: IMetadataExtractor,
    @Inject(IKnowledgeNodeCreator) private readonly knowledgeNodeCreator: IKnowledgeNodeCreator,
    @Inject(IGraphRelationshipDetector)
    private readonly graphRelationshipDetector: IGraphRelationshipDetector,
    @Inject(IIngestionEmbeddingOrchestrator)
    private readonly embeddingOrchestrator: IIngestionEmbeddingOrchestrator,
    @Inject(IIngestionVectorIndexer) private readonly vectorIndexer: IIngestionVectorIndexer,
    @Inject(IIngestionJobQueue) private readonly jobQueue: IIngestionJobQueue,
  ) {}

  async ingestDocument(request: DocumentIngestionRequest): Promise<Document> {
    this.logger.debug('Starting document ingestion', {
      filename: request.filename,
      organizationId: request.organizationId,
    })

    // 1. Validate file
    const validation = await this.validateFile(request)
    if (!validation.valid) {
      throw new ValidationException('File validation failed', {
        errors: validation.errors,
      })
    }

    // 2. Security scan
    if (request.content) {
      const scanResult = await this.securityScanner.scan(
        request.filename,
        Buffer.isBuffer(request.content) ? request.content : Buffer.from(request.content),
        request.contentType,
      )
      if (!scanResult.safe) {
        throw new ValidationException('Security scan failed', {
          threats: scanResult.threats,
        })
      }
    }

    // 3. Create document record
    const documentId = uuid() as EntityId
    const checksum = this.calculateChecksum(request.content ?? '')

    // Check for duplicates
    const existingDoc = await this.documentRepository.findByChecksum(
      request.organizationId,
      checksum,
    )
    if (existingDoc) {
      this.logger.debug('Duplicate document detected', {
        existingDocumentId: existingDoc.id,
        checksum,
      })
      return existingDoc
    }

    // 4. Store file
    let storagePath: string | undefined
    if (request.content) {
      const contentBuffer = Buffer.isBuffer(request.content)
        ? request.content
        : Buffer.from(request.content)
      const uploadResult = await this.objectStorage.upload(
        request.organizationId,
        documentId,
        request.filename,
        contentBuffer,
        request.contentType,
      )
      storagePath = uploadResult.storagePath
    }

    // 5. Create document
    const document = await this.documentRepository.create({
      id: documentId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      title: request.filename.replace(/\.[^/.]+$/, ''),
      filename: request.filename,
      contentType: request.contentType as ContentType,
      size: Buffer.isBuffer(request.content)
        ? request.content.length
        : typeof request.content === 'string'
          ? request.content.length
          : 0,
      checksum,
      version: 1,
      status: DocStatus.UPLOADED,
      sourceType: request.content ? 'FILE' : request.sourceUrl ? 'URL' : 'TEXT',
      sourceUrl: request.sourceUrl,
      storagePath,
      metadata: request.metadata ?? {},
      processingMetadata: {},
      departmentId: request.departmentId ?? null,
      tags: request.tags ?? [],
      visibility: request.visibility ?? 'ORGANIZATION',
    } as Omit<Document, 'createdAt' | 'updatedAt' | 'deletedAt'>)

    // 6. Queue ingestion job
    await this.jobQueue.addJob({
      documentId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      type: 'EXTRACT',
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      error: null,
      metadata: {
        filename: request.filename,
        contentType: request.contentType,
        storagePath,
      },
    })

    // 7. Update status to QUEUED
    await this.documentRepository.update(documentId, {
      status: DocStatus.QUEUED,
    })

    this.logger.debug('Document ingestion queued', {
      documentId,
      filename: request.filename,
    })

    return {
      ...document,
      status: DocStatus.QUEUED,
    }
  }

  async getDocument(id: EntityId, organizationId: EntityId): Promise<Document> {
    const document = await this.documentRepository.findById(id)
    if (!document || document.organizationId !== organizationId) {
      throw new NotFoundException('Document not found')
    }
    return document
  }

  async getDocumentsByOrganization(
    organizationId: EntityId,
    workspaceId?: EntityId,
  ): Promise<Document[]> {
    if (workspaceId) {
      return this.documentRepository.findByOrganizationAndWorkspace(organizationId, workspaceId)
    }
    return this.documentRepository.findByOrganization(organizationId)
  }

  async getDocumentStatus(id: EntityId): Promise<DocumentStatus> {
    const document = await this.documentRepository.findById(id)
    if (!document) {
      throw new NotFoundException('Document not found')
    }
    return document.status
  }

  async reprocessDocument(id: EntityId, organizationId: EntityId): Promise<Document> {
    const document = await this.getDocument(id, organizationId)

    // Update status to STALE
    await this.documentRepository.update(id, {
      status: DocStatus.STALE,
    })

    // Queue reprocessing job
    await this.jobQueue.addJob({
      documentId: id,
      organizationId,
      workspaceId: document.workspaceId,
      userId: organizationId, // Using organizationId as placeholder
      type: 'REPROCESS',
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      error: null,
      metadata: {
        filename: document.filename,
        contentType: document.contentType,
        storagePath: document.storagePath,
      },
    })

    return {
      ...document,
      status: DocStatus.STALE,
    }
  }

  async archiveDocument(id: EntityId, organizationId: EntityId): Promise<void> {
    await this.getDocument(id, organizationId)
    await this.documentRepository.update(id, {
      status: DocStatus.ARCHIVED,
      deletedAt: new Date().toISOString(),
    })
  }

  async deleteDocument(id: EntityId, organizationId: EntityId): Promise<void> {
    await this.getDocument(id, organizationId)

    // Delete from storage
    const document = await this.documentRepository.findById(id)
    if (document?.storagePath) {
      await this.objectStorage.delete(document.storagePath)
    }

    // Soft delete
    await this.documentRepository.softDelete(id)
  }

  /**
   * Process a document through the ingestion pipeline.
   * Called by the BullMQ worker.
   */
  async processDocument(documentId: EntityId): Promise<IngestionPipelineResult> {
    const startTime = Date.now()
    const stageResults: IngestionStageResult[] = []

    this.logger.debug('Starting document processing', { documentId })

    const document = await this.documentRepository.findById(documentId)
    if (!document) {
      throw new NotFoundException('Document not found')
    }

    try {
      // Stage 1: Validation
      const validationStage = await this.processStage(IngestionStage.VALIDATION, () =>
        this.processValidation(document),
      )
      stageResults.push(validationStage)

      // Stage 2: Extraction
      const extractionStage = await this.processStage(IngestionStage.EXTRACTION, () =>
        this.processExtraction(document),
      )
      stageResults.push(extractionStage)

      // Stage 3: Normalization
      const normalizationStage = await this.processStage(IngestionStage.NORMALIZATION, () =>
        this.processNormalization(document, extractionStage.metadata?.result as ExtractedDocument),
      )
      stageResults.push(normalizationStage)

      // Stage 4: Chunking
      const chunkingStage = await this.processStage(IngestionStage.CHUNKING, () =>
        this.processChunking(document, normalizationStage.metadata?.result as NormalizedContent),
      )
      stageResults.push(chunkingStage)

      // Stage 5: Metadata
      const metadataStage = await this.processStage(IngestionStage.METADATA, () =>
        this.processMetadata(document, extractionStage.metadata?.result as ExtractedDocument),
      )
      stageResults.push(metadataStage)

      // Stage 6: Knowledge Creation
      const knowledgeStage = await this.processStage(IngestionStage.KNOWLEDGE_CREATION, () =>
        this.processKnowledgeCreation(
          document,
          extractionStage.metadata?.result as ExtractedDocument,
          metadataStage.metadata?.result as Record<string, unknown>,
        ),
      )
      stageResults.push(knowledgeStage)

      // Stage 7: Graph Construction
      const graphStage = await this.processStage(IngestionStage.GRAPH_CONSTRUCTION, () =>
        this.processGraphConstruction(
          document,
          (knowledgeStage.metadata?.result as IngestedKnowledgeNode[]) ?? [],
          extractionStage.metadata?.result as ExtractedDocument,
        ),
      )
      stageResults.push(graphStage)

      // Stage 8: Embedding
      const embeddingStage = await this.processStage(IngestionStage.EMBEDDING, () =>
        this.processEmbedding(document, (chunkingStage.metadata?.result as DocumentChunk[]) ?? []),
      )
      stageResults.push(embeddingStage)

      // Stage 9: Indexing
      const indexingStage = await this.processStage(IngestionStage.INDEXING, () =>
        this.processIndexing(document, (chunkingStage.metadata?.result as DocumentChunk[]) ?? []),
      )
      stageResults.push(indexingStage)

      // Stage 10: Publishing
      const publishingStage = await this.processStage(IngestionStage.PUBLISHING, () =>
        this.processPublishing(document),
      )
      stageResults.push(publishingStage)

      // Update document status to READY
      await this.documentRepository.update(documentId, {
        status: DocStatus.READY,
        processingMetadata: {
          ...document.processingMetadata,
          totalDurationMs: Date.now() - startTime,
          chunkCount: Array.isArray(chunkingStage.metadata?.result)
            ? (chunkingStage.metadata.result as DocumentChunk[]).length
            : 0,
          nodeCount: Array.isArray(knowledgeStage.metadata?.result)
            ? (knowledgeStage.metadata.result as IngestedKnowledgeNode[]).length
            : 0,
        },
      })

      this.logger.debug('Document processing complete', {
        documentId,
        duration: Date.now() - startTime,
        stageCount: stageResults.length,
      })

      return {
        documentId,
        stages: stageResults,
        finalStatus: DocStatus.READY,
        totalDurationMs: Date.now() - startTime,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error('Document processing failed', {
        documentId,
        error: message,
      })

      // Update document status to FAILED
      await this.documentRepository.update(documentId, {
        status: DocStatus.FAILED,
        processingMetadata: {
          ...document.processingMetadata,
          totalDurationMs: Date.now() - startTime,
          error: message,
        },
      })

      return {
        documentId,
        stages: stageResults,
        finalStatus: DocStatus.FAILED,
        totalDurationMs: Date.now() - startTime,
        error: message,
      }
    }
  }

  private async processStage<T>(
    stage: IngestionStage,
    processor: () => Promise<T>,
  ): Promise<IngestionStageResult & { metadata?: Record<string, unknown> }> {
    const startTime = Date.now()

    try {
      this.logger.debug(`Processing stage: ${stage}`)
      const result = await processor()
      const duration = Date.now() - startTime

      return {
        stage,
        status: IngestionStageStatus.COMPLETED,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: duration,
        metadata: { result },
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const message = error instanceof Error ? error.message : 'Unknown error'

      this.logger.error(`Stage ${stage} failed`, {
        error: message,
        duration,
      })

      return {
        stage,
        status: IngestionStageStatus.FAILED,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: duration,
        error: message,
      }
    }
  }

  private async validateFile(
    request: DocumentIngestionRequest,
  ): Promise<{ valid: boolean; errors: string[] }> {
    if (!request.content) {
      return { valid: true, errors: [] }
    }

    const contentBuffer = Buffer.isBuffer(request.content)
      ? request.content
      : Buffer.from(request.content)

    const validation = await this.fileValidator.validate(
      request.filename,
      contentBuffer,
      request.contentType,
      {
        maxFileSize: request.ingestionOptions?.maxFileSize,
      },
    )

    return {
      valid: validation.valid,
      errors: [...validation.errors],
    }
  }

  private calculateChecksum(content: Buffer | string): string {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    return createHash('sha256').update(buffer).digest('hex')
  }

  private async processValidation(document: Document): Promise<void> {
    // Validation already done during ingestion
    this.logger.debug('Validation passed', { documentId: document.id })
  }

  private async processExtraction(document: Document): Promise<ExtractedDocument> {
    if (!document.storagePath) {
      throw new Error('No storage path for document')
    }

    const content = await this.objectStorage.download(document.storagePath)
    const extracted = await this.contentExtractor.extract(content, document.contentType)

    await this.documentRepository.update(document.id, {
      status: DocStatus.EXTRACTED,
      processingMetadata: {
        ...document.processingMetadata,
        extractionDurationMs: 0, // TODO: Track actual duration
      },
    })

    return extracted
  }

  private async processNormalization(
    document: Document,
    extracted: ExtractedDocument,
  ): Promise<NormalizedContent> {
    const normalized = await this.contentNormalizer.normalize(extracted)

    await this.documentRepository.update(document.id, {
      status: DocStatus.NORMALIZED,
      processingMetadata: {
        ...document.processingMetadata,
        normalizationDurationMs: 0, // TODO: Track actual duration
      },
    })

    return normalized
  }

  private async processChunking(
    document: Document,
    normalized: NormalizedContent,
  ): Promise<readonly DocumentChunk[]> {
    const chunks = await this.documentChunker.chunk(
      document.id,
      document.version,
      document.organizationId,
      document.workspaceId,
      normalized.text,
      normalized.sections,
      {
        title: document.title,
        filename: document.filename,
        contentType: document.contentType,
        departmentId: document.departmentId,
        tags: document.tags,
        visibility: document.visibility,
      },
    )

    await this.documentRepository.update(document.id, {
      status: DocStatus.CHUNKED,
      processingMetadata: {
        ...document.processingMetadata,
        chunkingDurationMs: 0, // TODO: Track actual duration
        chunkCount: chunks.length,
      },
    })

    return chunks
  }

  private async processMetadata(
    document: Document,
    extracted: ExtractedDocument,
  ): Promise<Record<string, unknown>> {
    const metadata = await this.metadataExtractor.extract(
      extracted,
      document.filename,
      document.contentType,
    )

    return metadata
  }

  private async processKnowledgeCreation(
    document: Document,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): Promise<readonly IngestedKnowledgeNode[]> {
    const nodes = await this.knowledgeNodeCreator.createNodes(
      document.id,
      document.version,
      document.organizationId,
      document.workspaceId,
      extracted,
      metadata,
    )

    await this.documentRepository.update(document.id, {
      processingMetadata: {
        ...document.processingMetadata,
        nodeCount: nodes.length,
      },
    })

    return nodes
  }

  private async processGraphConstruction(
    document: Document,
    nodes: readonly IngestedKnowledgeNode[],
    extracted: ExtractedDocument,
  ): Promise<readonly IngestedGraphRelationship[]> {
    const relationships = await this.graphRelationshipDetector.detectRelationships(
      document.id,
      nodes,
      extracted,
    )

    // TODO: Validate relationships through Graph Engine
    // TODO: Store relationships

    return relationships
  }

  private async processEmbedding(document: Document, chunks: DocumentChunk[]): Promise<void> {
    const startTime = Date.now()

    // Generate embeddings using the RetrievalModule's embedding service
    await this.embeddingOrchestrator.generateEmbeddings(
      document.id,
      chunks,
      document.organizationId,
      document.workspaceId,
    )

    const durationMs = Date.now() - startTime

    await this.documentRepository.update(document.id, {
      processingMetadata: {
        ...document.processingMetadata,
        embeddingDurationMs: durationMs,
      },
    })
  }

  private async processIndexing(document: Document, chunks: DocumentChunk[]): Promise<void> {
    const startTime = Date.now()

    // Index chunks using the RetrievalModule's vector store
    await this.vectorIndexer.indexChunks(
      document.id,
      chunks,
      document.organizationId,
      document.workspaceId,
    )

    const durationMs = Date.now() - startTime

    await this.documentRepository.update(document.id, {
      status: DocStatus.INDEXED,
      processingMetadata: {
        ...document.processingMetadata,
        indexingDurationMs: durationMs,
      },
    })
  }

  private async processPublishing(document: Document): Promise<void> {
    await this.documentRepository.update(document.id, {
      status: DocStatus.READY,
    })
  }
}
