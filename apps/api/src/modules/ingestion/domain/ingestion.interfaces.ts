import { EntityId } from '@contextgraph/types'
import type {
  Document,
  DocumentIngestionRequest,
  DocumentStatus,
  DocumentChunk,
  ExtractedDocument,
  NormalizedContent,
  IngestedKnowledgeNode,
  IngestedGraphRelationship,
  IngestionJob,
  IngestionPipelineResult,
  FileValidationResult,
  SecurityScanResult,
  StorageMetadata,
  UploadResult,
  ContentType,
} from './ingestion.types'

// ---------------------------------------------------------------------------
// Repository Interface
// ---------------------------------------------------------------------------

/** Document repository interface. */
export abstract class IDocumentRepository {
  abstract findById(id: EntityId): Promise<Document | null>
  abstract findByOrganization(organizationId: EntityId): Promise<Document[]>
  abstract findByOrganizationAndWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<Document[]>
  abstract create(
    document: Omit<Document, 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Document>
  abstract update(id: EntityId, updates: Partial<Document>): Promise<Document>
  abstract softDelete(id: EntityId): Promise<void>
  abstract findByChecksum(organizationId: EntityId, checksum: string): Promise<Document | null>
}

// ---------------------------------------------------------------------------
// Object Storage Interface
// ---------------------------------------------------------------------------

/** Object storage interface. */
export abstract class IObjectStorage {
  abstract upload(
    organizationId: EntityId,
    documentId: EntityId,
    filename: string,
    content: Buffer,
    contentType: string,
  ): Promise<UploadResult>
  abstract download(storagePath: string): Promise<Buffer>
  abstract delete(storagePath: string): Promise<void>
  abstract getMetadata(storagePath: string): Promise<StorageMetadata>
  abstract exists(storagePath: string): Promise<boolean>
}

// ---------------------------------------------------------------------------
// File Validation Interface
// ---------------------------------------------------------------------------

/** File validation interface. */
export abstract class IFileValidator {
  abstract validate(
    filename: string,
    content: Buffer,
    contentType: string,
    options?: {
      maxFileSize?: number
      allowedContentTypes?: readonly string[]
    },
  ): Promise<FileValidationResult>
}

// ---------------------------------------------------------------------------
// Security Scanner Interface
// ---------------------------------------------------------------------------

/** File security scanner interface. */
export abstract class IFileSecurityScanner {
  abstract scan(filename: string, content: Buffer, contentType: string): Promise<SecurityScanResult>
}

// ---------------------------------------------------------------------------
// Content Extractor Interface
// ---------------------------------------------------------------------------

/** Content extractor interface. */
export abstract class IContentExtractor {
  abstract extract(
    content: Buffer | string,
    contentType: ContentType,
    metadata?: Record<string, unknown>,
  ): Promise<ExtractedDocument>
  abstract supportedContentTypes(): readonly ContentType[]
}

// ---------------------------------------------------------------------------
// Content Normalizer Interface
// ---------------------------------------------------------------------------

/** Content normalizer interface. */
export abstract class IContentNormalizer {
  abstract normalize(extracted: ExtractedDocument): Promise<NormalizedContent>
}

// ---------------------------------------------------------------------------
// Document Chunker Interface
// ---------------------------------------------------------------------------

/** Document chunker interface. */
export abstract class IDocumentChunker {
  abstract chunk(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    sections: readonly import('./ingestion.types').DocumentSection[],
    metadata: import('./ingestion.types').ChunkMetadata,
    options?: {
      chunkSize?: number
      chunkOverlap?: number
    },
  ): Promise<readonly DocumentChunk[]>
}

// ---------------------------------------------------------------------------
// Metadata Extractor Interface
// ---------------------------------------------------------------------------

/** Metadata extractor interface. */
export abstract class IMetadataExtractor {
  abstract extract(
    extracted: ExtractedDocument,
    filename: string,
    contentType: ContentType,
  ): Promise<Record<string, unknown>>
}

// ---------------------------------------------------------------------------
// Knowledge Node Creator Interface
// ---------------------------------------------------------------------------

/** Knowledge node creator interface. */
export abstract class IKnowledgeNodeCreator {
  abstract createNodes(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): Promise<readonly IngestedKnowledgeNode[]>
}

// ---------------------------------------------------------------------------
// Graph Relationship Detector Interface
// ---------------------------------------------------------------------------

/** Graph relationship detector interface. */
export abstract class IGraphRelationshipDetector {
  abstract detectRelationships(
    documentId: EntityId,
    nodes: readonly IngestedKnowledgeNode[],
    extracted: ExtractedDocument,
  ): Promise<readonly IngestedGraphRelationship[]>
}

// ---------------------------------------------------------------------------
// Embedding Orchestrator Interface
// ---------------------------------------------------------------------------

/** Embedding orchestrator interface for ingestion. */
export abstract class IIngestionEmbeddingOrchestrator {
  abstract generateEmbeddings(
    documentId: EntityId,
    chunks: readonly DocumentChunk[],
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void>
}

// ---------------------------------------------------------------------------
// Vector Indexer Interface
// ---------------------------------------------------------------------------

/** Vector indexer interface for ingestion. */
export abstract class IIngestionVectorIndexer {
  abstract indexChunks(
    documentId: EntityId,
    chunks: readonly DocumentChunk[],
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void>
  abstract deleteDocumentVectors(documentId: EntityId): Promise<void>
}

// ---------------------------------------------------------------------------
// Ingestion Service Interface
// ---------------------------------------------------------------------------

/** Ingestion service interface. */
export abstract class IIngestionService {
  abstract ingestDocument(request: DocumentIngestionRequest): Promise<Document>
  abstract getDocument(id: EntityId, organizationId: EntityId): Promise<Document>
  abstract getDocumentsByOrganization(
    organizationId: EntityId,
    workspaceId?: EntityId,
  ): Promise<Document[]>
  abstract getDocumentStatus(id: EntityId): Promise<DocumentStatus>
  abstract reprocessDocument(id: EntityId, organizationId: EntityId): Promise<Document>
  abstract archiveDocument(id: EntityId, organizationId: EntityId): Promise<void>
  abstract deleteDocument(id: EntityId, organizationId: EntityId): Promise<void>
}

// ---------------------------------------------------------------------------
// Ingestion Job Queue Interface
// ---------------------------------------------------------------------------

/** Ingestion job queue interface. */
export abstract class IIngestionJobQueue {
  abstract addJob(
    job: Omit<IngestionJob, 'jobId' | 'status' | 'attempts' | 'createdAt'>,
  ): Promise<IngestionJob>
  abstract getJob(jobId: string): Promise<IngestionJob | null>
  abstract getJobsByDocument(documentId: EntityId): Promise<IngestionJob[]>
  abstract getJobsByOrganization(organizationId: EntityId): Promise<IngestionJob[]>
}

// ---------------------------------------------------------------------------
// Ingestion Pipeline Interface
// ---------------------------------------------------------------------------

/** Ingestion pipeline interface. */
export abstract class IIngestionPipeline {
  abstract execute(
    document: Document,
    request: DocumentIngestionRequest,
  ): Promise<IngestionPipelineResult>
}

// ---------------------------------------------------------------------------
// Content Hasher Interface
// ---------------------------------------------------------------------------

/** Content hasher interface. */
export abstract class IContentHasher {
  abstract hash(content: Buffer | string): string
  abstract verify(content: Buffer | string, expectedHash: string): boolean
}
