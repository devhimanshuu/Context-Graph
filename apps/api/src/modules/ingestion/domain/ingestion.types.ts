import { EntityId, Score, Timestamp } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Document Types
// ---------------------------------------------------------------------------

/** Document lifecycle states. */
export const DocumentStatus = {
  UPLOADED: 'UPLOADED',
  VALIDATING: 'VALIDATING',
  QUEUED: 'QUEUED',
  EXTRACTING: 'EXTRACTING',
  EXTRACTED: 'EXTRACTED',
  NORMALIZING: 'NORMALIZING',
  NORMALIZED: 'NORMALIZED',
  CHUNKING: 'CHUNKING',
  CHUNKED: 'CHUNKED',
  INDEXING: 'INDEXING',
  INDEXED: 'INDEXED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
  STALE: 'STALE',
} as const
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]

/** Supported document source types. */
export const DocumentSourceType = {
  FILE: 'FILE',
  URL: 'URL',
  TEXT: 'TEXT',
  API: 'API',
} as const
export type DocumentSourceType = (typeof DocumentSourceType)[keyof typeof DocumentSourceType]

/** Supported content types for extraction. */
export const ContentType = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  MARKDOWN: 'text/markdown',
  HTML: 'text/html',
  JSON: 'application/json',
} as const
export type ContentType = (typeof ContentType)[keyof typeof ContentType]

/** Supported content type extensions. */
export const ContentTypeExtensions: Record<string, ContentType> = {
  '.pdf': ContentType.PDF,
  '.docx': ContentType.DOCX,
  '.doc': ContentType.DOCX,
  '.txt': ContentType.TXT,
  '.md': ContentType.MARKDOWN,
  '.markdown': ContentType.MARKDOWN,
  '.html': ContentType.HTML,
  '.htm': ContentType.HTML,
  '.json': ContentType.JSON,
}

/** Document entity. */
export interface Document {
  readonly id: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly title: string
  readonly filename: string
  readonly contentType: ContentType
  readonly size: number
  readonly checksum: string
  readonly version: number
  readonly status: DocumentStatus
  readonly sourceType: DocumentSourceType
  readonly sourceUrl?: string
  readonly storagePath?: string
  readonly metadata: DocumentMetadata
  readonly processingMetadata: ProcessingMetadata
  readonly departmentId: EntityId | null
  readonly tags: readonly string[]
  readonly visibility: DocumentVisibility
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
  readonly deletedAt: Timestamp | null
}

/** Document metadata. */
export interface DocumentMetadata {
  readonly author?: string
  readonly pageCount?: number
  readonly wordCount?: number
  readonly language?: string
  readonly createdAt?: Timestamp
  readonly modifiedAt?: Timestamp
  readonly customMetadata?: Record<string, unknown>
}

/** Processing metadata. */
export interface ProcessingMetadata {
  readonly extractionDurationMs?: number
  readonly normalizationDurationMs?: number
  readonly chunkingDurationMs?: number
  readonly embeddingDurationMs?: number
  readonly indexingDurationMs?: number
  readonly totalDurationMs?: number
  readonly chunkCount?: number
  readonly nodeCount?: number
  readonly error?: string
  readonly warnings?: readonly string[]
}

/** Document visibility. */
export const DocumentVisibility = {
  PRIVATE: 'PRIVATE',
  ORGANIZATION: 'ORGANIZATION',
  PUBLIC: 'PUBLIC',
} as const
export type DocumentVisibility = (typeof DocumentVisibility)[keyof typeof DocumentVisibility]

// ---------------------------------------------------------------------------
// Ingestion Request Types
// ---------------------------------------------------------------------------

/** Document ingestion request. */
export interface DocumentIngestionRequest {
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userId: EntityId
  readonly filename: string
  readonly contentType: ContentType
  readonly content?: Buffer | string
  readonly sourceUrl?: string
  readonly metadata?: Partial<DocumentMetadata>
  readonly departmentId?: EntityId | null
  readonly tags?: readonly string[]
  readonly visibility?: DocumentVisibility
  readonly ingestionOptions?: IngestionOptions
}

/** Ingestion options. */
export interface IngestionOptions {
  readonly skipValidation?: boolean
  readonly skipExtraction?: boolean
  readonly skipChunking?: boolean
  readonly skipEmbedding?: boolean
  readonly skipGraphConstruction?: boolean
  readonly forceReindex?: boolean
  readonly chunkSize?: number
  readonly chunkOverlap?: number
  readonly maxFileSize?: number
}

// ---------------------------------------------------------------------------
// Storage Types
// ---------------------------------------------------------------------------

/** Object storage metadata. */
export interface StorageMetadata {
  readonly bucket: string
  readonly key: string
  readonly size: number
  readonly contentType: string
  readonly checksum: string
  readonly lastModified: Timestamp
}

/** Upload result. */
export interface UploadResult {
  readonly storagePath: string
  readonly metadata: StorageMetadata
}

// ---------------------------------------------------------------------------
// Extraction Types
// ---------------------------------------------------------------------------

/** Extracted document content. */
export interface ExtractedDocument {
  readonly text: string
  readonly title: string
  readonly sections: readonly DocumentSection[]
  readonly headings: readonly string[]
  readonly pageInfo?: readonly PageInfo[]
  readonly sourceMetadata: SourceMetadata
  readonly warnings: readonly string[]
}

/** Document section. */
export interface DocumentSection {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly level: number
  readonly startIndex: number
  readonly endIndex: number
  readonly pageNumber?: number
  readonly subsections: readonly DocumentSection[]
}

/** Page information. */
export interface PageInfo {
  readonly pageNumber: number
  readonly startIndex: number
  readonly endIndex: number
}

/** Source metadata. */
export interface SourceMetadata {
  readonly filename: string
  readonly contentType: ContentType
  readonly size: number
  readonly checksum: string
  readonly extractedAt: Timestamp
  readonly extractionMethod: string
}

// ---------------------------------------------------------------------------
// Normalization Types
// ---------------------------------------------------------------------------

/** Normalized content. */
export interface NormalizedContent {
  readonly text: string
  readonly sections: readonly DocumentSection[]
  readonly normalizedAt: Timestamp
  readonly changes: readonly NormalizationChange[]
}

/** Normalization change. */
export interface NormalizationChange {
  readonly type: string
  readonly description: string
  readonly startIndex?: number
  readonly endIndex?: number
}

// ---------------------------------------------------------------------------
// Chunking Types
// ---------------------------------------------------------------------------

/** Document chunk. */
export interface DocumentChunk {
  readonly chunkId: string
  readonly documentId: EntityId
  readonly documentVersion: number
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly content: string
  readonly chunkIndex: number
  readonly totalChunks: number
  readonly startOffset: number
  readonly endOffset: number
  readonly section?: string
  readonly subsection?: string
  readonly page?: number
  readonly contentHash: string
  readonly metadata: ChunkMetadata
  readonly createdAt: Timestamp
}

/** Chunk metadata for ingestion. */
export interface ChunkMetadata {
  readonly title: string
  readonly filename: string
  readonly contentType: ContentType
  readonly departmentId: EntityId | null
  readonly tags: readonly string[]
  readonly visibility: DocumentVisibility
}

// ---------------------------------------------------------------------------
// Knowledge Node Types
// ---------------------------------------------------------------------------

/** Knowledge node created from document. */
export interface IngestedKnowledgeNode {
  readonly nodeId: EntityId
  readonly documentId: EntityId
  readonly documentVersion: number
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly title: string
  readonly content: string
  readonly type: KnowledgeNodeType
  readonly importance: Score
  readonly status: KnowledgeNodeStatus
  readonly departmentId: EntityId | null
  readonly complianceTags: readonly string[]
  readonly metadata: Record<string, unknown>
  readonly createdAt: Timestamp
}

/** Knowledge node types. */
export const KnowledgeNodeType = {
  DOCUMENT: 'DOCUMENT',
  SECTION: 'SECTION',
  POLICY: 'POLICY',
  PROCEDURE: 'PROCEDURE',
  GUIDELINE: 'GUIDELINE',
  FACT: 'FACT',
  CONCEPT: 'CONCEPT',
  ENTITY: 'ENTITY',
  TOPIC: 'TOPIC',
} as const
export type KnowledgeNodeType = (typeof KnowledgeNodeType)[keyof typeof KnowledgeNodeType]

/** Knowledge node status. */
export const KnowledgeNodeStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
} as const
export type KnowledgeNodeStatus = (typeof KnowledgeNodeStatus)[keyof typeof KnowledgeNodeStatus]

// ---------------------------------------------------------------------------
// Graph Relationship Types
// ---------------------------------------------------------------------------

/** Graph relationship created from document. */
export interface IngestedGraphRelationship {
  readonly sourceNodeId: EntityId
  readonly targetNodeId: EntityId
  readonly relationshipType: GraphRelationshipType
  readonly weight: number
  readonly metadata?: Record<string, unknown>
}

/** Graph relationship types. */
export const GraphRelationshipType = {
  DOCUMENT_CONTAINS_SECTION: 'DOCUMENT_CONTAINS_SECTION',
  SECTION_CONTAINS_CHUNK: 'SECTION_CONTAINS_CHUNK',
  DOCUMENT_BELONGS_TO_DEPARTMENT: 'DOCUMENT_BELONGS_TO_DEPARTMENT',
  NODE_DERIVED_FROM_DOCUMENT: 'NODE_DERIVED_FROM_DOCUMENT',
  NODE_RELATED_TO_TOPIC: 'NODE_RELATED_TO_TOPIC',
  NODE_REFERENCES_NODE: 'NODE_REFERENCES_NODE',
} as const
export type GraphRelationshipType =
  (typeof GraphRelationshipType)[keyof typeof GraphRelationshipType]

// ---------------------------------------------------------------------------
// Embedding Types
// ---------------------------------------------------------------------------

/** Embedding generation request for ingestion. */
export interface IngestionEmbeddingRequest {
  readonly documentId: EntityId
  readonly chunks: readonly DocumentChunk[]
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
}

// ---------------------------------------------------------------------------
// Pipeline Types
// ---------------------------------------------------------------------------

/** Ingestion pipeline stage. */
export const IngestionStage = {
  VALIDATION: 'VALIDATION',
  STORAGE: 'STORAGE',
  EXTRACTION: 'EXTRACTION',
  NORMALIZATION: 'NORMALIZATION',
  CHUNKING: 'CHUNKING',
  METADATA: 'METADATA',
  KNOWLEDGE_CREATION: 'KNOWLEDGE_CREATION',
  GRAPH_CONSTRUCTION: 'GRAPH_CONSTRUCTION',
  EMBEDDING: 'EMBEDDING',
  INDEXING: 'INDEXING',
  PUBLISHING: 'PUBLISHING',
} as const
export type IngestionStage = (typeof IngestionStage)[keyof typeof IngestionStage]

/** Ingestion pipeline stage status. */
export const IngestionStageStatus = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const
export type IngestionStageStatus = (typeof IngestionStageStatus)[keyof typeof IngestionStageStatus]

/** Ingestion pipeline stage result. */
export interface IngestionStageResult {
  readonly stage: IngestionStage
  readonly status: IngestionStageStatus
  readonly startedAt: Timestamp
  readonly completedAt?: Timestamp
  readonly durationMs?: number
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

/** Ingestion pipeline result. */
export interface IngestionPipelineResult {
  readonly documentId: EntityId
  readonly stages: readonly IngestionStageResult[]
  readonly finalStatus: DocumentStatus
  readonly totalDurationMs: number
  readonly error?: string
}

// ---------------------------------------------------------------------------
// Job Types
// ---------------------------------------------------------------------------

/** Ingestion job types. */
export const IngestionJobType = {
  VALIDATE: 'VALIDATE',
  EXTRACT: 'EXTRACT',
  NORMALIZE: 'NORMALIZE',
  CHUNK: 'CHUNK',
  METADATA: 'METADATA',
  KNOWLEDGE: 'KNOWLEDGE',
  GRAPH: 'GRAPH',
  EMBED: 'EMBED',
  INDEX: 'INDEX',
  PUBLISH: 'PUBLISH',
  REPROCESS: 'REPROCESS',
} as const
export type IngestionJobType = (typeof IngestionJobType)[keyof typeof IngestionJobType]

/** Ingestion job. */
export interface IngestionJob {
  readonly jobId: string
  readonly documentId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userId: EntityId
  readonly type: IngestionJobType
  readonly status: IngestionJobStatus
  readonly attempts: number
  readonly maxAttempts: number
  readonly createdAt: Timestamp
  readonly startedAt: Timestamp | null
  readonly completedAt: Timestamp | null
  readonly error: string | null
  readonly metadata?: Record<string, unknown>
}

/** Ingestion job status. */
export const IngestionJobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const
export type IngestionJobStatus = (typeof IngestionJobStatus)[keyof typeof IngestionJobStatus]

// ---------------------------------------------------------------------------
// Security Types
// ---------------------------------------------------------------------------

/** File validation result. */
export interface FileValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
  readonly metadata: FileMetadata
}

/** File metadata. */
export interface FileMetadata {
  readonly filename: string
  readonly contentType: ContentType
  readonly size: number
  readonly extension: string
  readonly checksum: string
}

/** Security scan result. */
export interface SecurityScanResult {
  readonly safe: boolean
  readonly threats: readonly string[]
  readonly scanner: string
  readonly scannedAt: Timestamp
}
