import { EntityId, Score, Timestamp } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Retrieval Query Types
// ---------------------------------------------------------------------------

/** Retrieval modes. */
export const RetrievalMode = {
  GRAPH_ONLY: 'GRAPH_ONLY',
  SEMANTIC_ONLY: 'SEMANTIC_ONLY',
  LEXICAL_ONLY: 'LEXICAL_ONLY',
  HYBRID: 'HYBRID',
} as const
export type RetrievalMode = (typeof RetrievalMode)[keyof typeof RetrievalMode]

/** Retrieval query. */
export interface RetrievalQuery {
  readonly userQuery: string
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userId: EntityId
  readonly entryNodeId?: EntityId
  readonly topK: RetrievalTopK
  readonly filters: RetrievalFilters
  readonly mode: RetrievalMode
  readonly timestamp: Timestamp
  readonly configuration: RetrievalConfiguration
}

/** TopK configuration for each retrieval method. */
export interface RetrievalTopK {
  readonly graphTopK: number
  readonly semanticTopK: number
  readonly lexicalTopK: number
  readonly finalTopK: number
}

/** Retrieval filters. */
export interface RetrievalFilters {
  readonly nodeTypes?: readonly string[]
  readonly statuses?: readonly string[]
  readonly complianceTags?: readonly string[]
  readonly departments?: readonly EntityId[]
  readonly dateRange?: {
    readonly from?: Timestamp
    readonly to?: Timestamp
  }
}

/** Retrieval configuration. */
export interface RetrievalConfiguration {
  readonly enableGraph: boolean
  readonly enableSemantic: boolean
  readonly enableLexical: boolean
  readonly semanticWeight: number
  readonly graphWeight: number
  readonly lexicalWeight: number
  readonly minSimilarity: number
}

// ---------------------------------------------------------------------------
// Retrieval Result Types
// ---------------------------------------------------------------------------

/** Retrieval result. */
export interface RetrievalResult {
  readonly candidates: readonly RetrievedCandidate[]
  readonly mode: RetrievalMode
  readonly totalResults: number
  readonly graphResults: readonly RetrievedCandidate[]
  readonly semanticResults: readonly RetrievedCandidate[]
  readonly lexicalResults: readonly RetrievedCandidate[]
  readonly fusionMetadata: FusionMetadata
  readonly metrics: RetrievalMetrics
}

/** A retrieved candidate. */
export interface RetrievedCandidate {
  readonly nodeId: EntityId
  readonly title: string
  readonly content: string
  readonly type: string
  readonly status: string
  readonly importance: Score
  readonly organizationId: EntityId
  readonly departmentId: EntityId | null
  readonly workspaceId: EntityId
  readonly complianceTags: readonly string[]
  readonly retrievalMethod: RetrievalMethod
  readonly graphDistance: number | null
  readonly semanticSimilarity: number | null
  readonly lexicalScore: number | null
  readonly fusedScore: number
  readonly rank: number
  readonly explanation: RetrievalExplanation
}

/** Retrieval methods. */
export const RetrievalMethod = {
  GRAPH: 'GRAPH',
  SEMANTIC: 'SEMANTIC',
  LEXICAL: 'LEXICAL',
  FUSED: 'FUSED',
} as const
export type RetrievalMethod = (typeof RetrievalMethod)[keyof typeof RetrievalMethod]

/** Retrieval explanation. */
export interface RetrievalExplanation {
  readonly method: RetrievalMethod
  readonly graphDistance: number | null
  readonly semanticSimilarity: number | null
  readonly lexicalScore: number | null
  readonly fusedRank: number
  readonly metadataMatches: readonly string[]
  readonly authorizationResult: AuthorizationResult
  readonly ruleResult: RuleResult | null
}

/** Authorization result for explanation. */
export interface AuthorizationResult {
  readonly allowed: boolean
  readonly reason: string
  readonly permissionLevel: string | null
  readonly complianceClearance: string | null
}

/** Rule result for explanation. */
export interface RuleResult {
  readonly passed: boolean
  readonly ruleId: string
  readonly reasonCode: string
  readonly reason: string
}

/** Fusion metadata. */
export interface FusionMetadata {
  readonly strategy: string
  readonly graphWeight: number
  readonly semanticWeight: number
  readonly lexicalWeight: number
  readonly totalCandidates: number
  readonly fusedCandidates: number
}

/** Retrieval metrics. */
export interface RetrievalMetrics {
  readonly queryLatencyMs: number
  readonly embeddingLatencyMs: number
  readonly vectorSearchLatencyMs: number
  readonly lexicalSearchLatencyMs: number
  readonly graphRetrievalLatencyMs: number
  readonly fusionLatencyMs: number
  readonly authorizationLatencyMs: number
  readonly ruleFilteringLatencyMs: number
  readonly finalCandidateCount: number
  readonly cacheHitRate: number
}

// ---------------------------------------------------------------------------
// Vector Store Types
// ---------------------------------------------------------------------------

/** Vector record. */
export interface VectorRecord {
  readonly chunkId: string
  readonly nodeId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly embedding: readonly number[]
  readonly embeddingModel: string
  readonly embeddingVersion: string
  readonly contentHash: string
  readonly content: string
  readonly metadata: VectorMetadata
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
}

/** Vector metadata. */
export interface VectorMetadata {
  readonly title: string
  readonly type: string
  readonly status: string
  readonly importance: Score
  readonly departmentId: EntityId | null
  readonly complianceTags: readonly string[]
  readonly chunkIndex: number
  readonly totalChunks: number
}

/** Vector search query. */
export interface VectorSearchQuery {
  readonly embedding: readonly number[]
  readonly organizationId: EntityId
  readonly workspaceId?: EntityId
  readonly topK: number
  readonly filters?: VectorFilters
  readonly minSimilarity?: number
}

/** Vector filters. */
export interface VectorFilters {
  readonly nodeTypes?: readonly string[]
  readonly statuses?: readonly string[]
  readonly complianceTags?: readonly string[]
  readonly departments?: readonly EntityId[]
}

/** Vector search result. */
export interface VectorSearchResult {
  readonly records: readonly VectorSearchHit[]
  readonly totalMatches: number
  readonly queryTimeMs: number
}

/** Vector search hit. */
export interface VectorSearchHit {
  readonly record: VectorRecord
  readonly similarity: number
  readonly rank: number
}

// ---------------------------------------------------------------------------
// Embedding Types
// ---------------------------------------------------------------------------

/** Embedding configuration. */
export interface EmbeddingConfiguration {
  readonly provider: EmbeddingProvider
  readonly model: string
  readonly dimensions: number
  readonly batchSize: number
  readonly timeout: number
  readonly retryPolicy: RetryPolicy
}

/** Embedding providers. */
export const EmbeddingProvider = {
  OPENAI: 'OPENAI',
  OLLAMA: 'OLLAMA',
  LOCAL: 'LOCAL',
} as const
export type EmbeddingProvider = (typeof EmbeddingProvider)[keyof typeof EmbeddingProvider]

/** Retry policy. */
export interface RetryPolicy {
  readonly maxRetries: number
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly backoffMultiplier: number
}

/** Embedding request. */
export interface EmbeddingRequest {
  readonly texts: readonly string[]
  readonly model: string
  readonly dimensions?: number
}

/** Embedding response. */
export interface EmbeddingResponse {
  readonly embeddings: readonly number[][]
  readonly model: string
  readonly dimensions: number
  readonly usage: EmbeddingUsage
}

/** Embedding usage. */
export interface EmbeddingUsage {
  readonly totalTokens: number
}

// ---------------------------------------------------------------------------
// Chunking Types
// ---------------------------------------------------------------------------

/** Chunking configuration. */
export interface ChunkingConfiguration {
  readonly maxChunkSize: number
  readonly overlapSize: number
  readonly preserveSentenceBoundaries: boolean
  readonly preserveParagraphBoundaries: boolean
}

/** A text chunk. */
export interface TextChunk {
  readonly chunkId: string
  readonly nodeId: EntityId
  readonly content: string
  readonly chunkIndex: number
  readonly totalChunks: number
  readonly startOffset: number
  readonly endOffset: number
  readonly contentHash: string
  readonly metadata: ChunkMetadata
}

/** Chunk metadata. */
export interface ChunkMetadata {
  readonly title: string
  readonly type: string
  readonly status: string
  readonly importance: Score
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly departmentId: EntityId | null
  readonly complianceTags: readonly string[]
}

// ---------------------------------------------------------------------------
// Indexing Types
// ---------------------------------------------------------------------------

/** Index status. */
export const IndexStatus = {
  NOT_INDEXED: 'NOT_INDEXED',
  QUEUED: 'QUEUED',
  INDEXING: 'INDEXING',
  INDEXED: 'INDEXED',
  FAILED: 'FAILED',
  STALE: 'STALE',
} as const
export type IndexStatus = (typeof IndexStatus)[keyof typeof IndexStatus]

/** Index status record. */
export interface IndexStatusRecord {
  readonly nodeId: EntityId
  readonly status: IndexStatus
  readonly lastIndexedAt: Timestamp | null
  readonly embeddingModel: string | null
  readonly embeddingVersion: string | null
  readonly contentHash: string | null
  readonly chunkCount: number
  readonly error: string | null
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
}

/** Indexing job. */
export interface IndexingJob {
  readonly jobId: string
  readonly nodeId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly type: IndexingJobType
  readonly status: IndexingJobStatus
  readonly attempts: number
  readonly maxAttempts: number
  readonly createdAt: Timestamp
  readonly startedAt: Timestamp | null
  readonly completedAt: Timestamp | null
  readonly error: string | null
}

/** Indexing job types. */
export const IndexingJobType = {
  INDEX: 'INDEX',
  REINDEX: 'REINDEX',
  DELETE: 'DELETE',
  UPDATE: 'UPDATE',
} as const
export type IndexingJobType = (typeof IndexingJobType)[keyof typeof IndexingJobType]

/** Indexing job status. */
export const IndexingJobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const
export type IndexingJobStatus = (typeof IndexingJobStatus)[keyof typeof IndexingJobStatus]

// ---------------------------------------------------------------------------
// Query Processing Types
// ---------------------------------------------------------------------------

/** Processed query. */
export interface ProcessedQuery {
  readonly originalQuery: string
  readonly processedQuery: string
  readonly keywords: readonly string[]
  readonly entities: readonly string[]
  readonly intent: string | null
}
