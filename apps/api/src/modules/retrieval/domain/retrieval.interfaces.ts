import { EntityId } from '@contextgraph/types'
import {
  RetrievalQuery,
  RetrievalResult,
  RetrievedCandidate,
  VectorRecord,
  VectorSearchQuery,
  VectorSearchResult,
  EmbeddingConfiguration,
  EmbeddingRequest,
  EmbeddingResponse,
  ChunkingConfiguration,
  TextChunk,
  ChunkMetadata,
  IndexStatusRecord,
  IndexingJob,
  ProcessedQuery,
  RetrievalMode,
} from './retrieval.types'

// ---------------------------------------------------------------------------
// Retriever Interface
// ---------------------------------------------------------------------------

/** Main retriever interface. */
export abstract class IRetriever {
  abstract retrieve(query: RetrievalQuery): Promise<RetrievalResult>
}

// ---------------------------------------------------------------------------
// Graph Retriever Interface
// ---------------------------------------------------------------------------

/** Graph-based retrieval. */
export abstract class IGraphRetriever {
  abstract retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]>
}

// ---------------------------------------------------------------------------
// Semantic Retriever Interface
// ---------------------------------------------------------------------------

/** Semantic/vector-based retrieval. */
export abstract class ISemanticRetriever {
  abstract search(query: VectorSearchQuery): Promise<VectorSearchResult>
  abstract retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]>
}

// ---------------------------------------------------------------------------
// Lexical Retriever Interface
// ---------------------------------------------------------------------------

/** Lexical/text-based retrieval. */
export abstract class ILexicalRetriever {
  abstract search(
    query: string,
    organizationId: EntityId,
    topK: number,
  ): Promise<RetrievedCandidate[]>
  abstract retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]>
}

// ---------------------------------------------------------------------------
// Hybrid Retriever Interface
// ---------------------------------------------------------------------------

/** Hybrid retrieval combining multiple methods. */
export abstract class IHybridRetriever {
  abstract retrieve(query: RetrievalQuery): Promise<RetrievalResult>
  abstract fuseResults(
    graphResults: readonly RetrievedCandidate[],
    semanticResults: readonly RetrievedCandidate[],
    lexicalResults: readonly RetrievedCandidate[],
    weights: { graph: number; semantic: number; lexical: number },
  ): readonly RetrievedCandidate[]
}

// ---------------------------------------------------------------------------
// Vector Store Interface
// ---------------------------------------------------------------------------

/** Vector database abstraction. */
export abstract class IVectorStore {
  abstract upsert(records: readonly VectorRecord[]): Promise<void>
  abstract search(query: VectorSearchQuery): Promise<VectorSearchResult>
  abstract delete(chunkIds: readonly string[]): Promise<void>
  abstract deleteByNodeId(nodeId: EntityId): Promise<void>
  abstract deleteByOrganizationId(organizationId: EntityId): Promise<void>
  abstract count(organizationId: EntityId): Promise<number>
  abstract getById(chunkId: string): Promise<VectorRecord | null>
}

// ---------------------------------------------------------------------------
// Embedding Service Interface
// ---------------------------------------------------------------------------

/** Embedding generation service. */
export abstract class IEmbeddingService {
  abstract generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>
  abstract getConfiguration(): EmbeddingConfiguration
  abstract getDimensions(): number
  abstract getModel(): string
}

// ---------------------------------------------------------------------------
// Chunker Interface
// ---------------------------------------------------------------------------

/** Text chunking service. */
export abstract class IChunker {
  abstract chunk(
    content: string,
    nodeId: EntityId,
    metadata: ChunkMetadata,
    config?: Partial<ChunkingConfiguration>,
  ): readonly TextChunk[]
  abstract getConfiguration(): ChunkingConfiguration
}

// ---------------------------------------------------------------------------
// Content Hasher Interface
// ---------------------------------------------------------------------------

/** Content hashing service. */
export abstract class IContentHasher {
  abstract hash(content: string): string
  abstract hashChunk(chunk: TextChunk): string
}

// ---------------------------------------------------------------------------
// Query Processor Interface
// ---------------------------------------------------------------------------

/** Query processing service. */
export abstract class IQueryProcessor {
  abstract process(query: string): Promise<ProcessedQuery>
}

// ---------------------------------------------------------------------------
// Indexing Service Interface
// ---------------------------------------------------------------------------

/** Indexing service for knowledge nodes. */
export abstract class IIndexingService {
  abstract indexNode(
    nodeId: EntityId,
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void>
  abstract reindexNode(
    nodeId: EntityId,
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<void>
  abstract deleteNode(nodeId: EntityId, organizationId: EntityId): Promise<void>
  abstract getIndexStatus(nodeId: EntityId): Promise<IndexStatusRecord | null>
  abstract getIndexStatusByOrganization(organizationId: EntityId): Promise<IndexStatusRecord[]>
}

// ---------------------------------------------------------------------------
// Indexing Job Queue Interface
// ---------------------------------------------------------------------------

/** Indexing job queue. */
export abstract class IIndexingJobQueue {
  abstract addJob(
    job: Omit<IndexingJob, 'jobId' | 'status' | 'attempts' | 'createdAt'>,
  ): Promise<IndexingJob>
  abstract getJob(jobId: string): Promise<IndexingJob | null>
  abstract getJobsByNode(nodeId: EntityId): Promise<IndexingJob[]>
  abstract getJobsByOrganization(organizationId: EntityId): Promise<IndexingJob[]>
}

// ---------------------------------------------------------------------------
// Retrieval Cache Interface
// ---------------------------------------------------------------------------

/** Retrieval cache. */
export abstract class IRetrievalCache {
  abstract get(key: string): Promise<RetrievalResult | null>
  abstract set(key: string, result: RetrievalResult, ttlSeconds: number): Promise<void>
  abstract invalidate(key: string): Promise<void>
  abstract invalidateByOrganization(organizationId: EntityId): Promise<void>
}

// ---------------------------------------------------------------------------
// Retrieval Metrics Interface
// ---------------------------------------------------------------------------

/** Retrieval metrics collector. */
export abstract class IRetrievalMetrics {
  abstract recordQueryLatency(latencyMs: number, mode: RetrievalMode): void
  abstract recordEmbeddingLatency(latencyMs: number): void
  abstract recordVectorSearchLatency(latencyMs: number): void
  abstract recordLexicalSearchLatency(latencyMs: number): void
  abstract recordGraphRetrievalLatency(latencyMs: number): void
  abstract recordFusionLatency(latencyMs: number): void
  abstract recordAuthorizationLatency(latencyMs: number): void
  abstract recordRuleFilteringLatency(latencyMs: number): void
  abstract recordCacheHit(rate: number): void
  abstract getMetrics(): RetrievalMetricsSummary
}

/** Retrieval metrics summary. */
export interface RetrievalMetricsSummary {
  readonly totalQueries: number
  readonly avgQueryLatencyMs: number
  readonly avgEmbeddingLatencyMs: number
  readonly avgVectorSearchLatencyMs: number
  readonly avgLexicalSearchLatencyMs: number
  readonly avgGraphRetrievalLatencyMs: number
  readonly avgFusionLatencyMs: number
  readonly avgAuthorizationLatencyMs: number
  readonly avgRuleFilteringLatencyMs: number
  readonly cacheHitRate: number
}
