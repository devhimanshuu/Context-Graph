import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { RetrievalController } from './controllers/retrieval.controller'
import { RetrievalService } from './services/retrieval.service'
import { VectorStoreService } from './services/vector-store.service'
import { EmbeddingService } from './services/embedding.service'
import { ChunkerService, ContentHasher } from './services/chunker.service'
import { IndexingService } from './services/indexing.service'
import { IndexingJobQueue } from './jobs/indexing-queue.service'
import { IndexingProcessor } from './jobs/indexing.processor'
import { GraphRetriever } from './adapters/graph-retriever.adapter'
import { SemanticRetriever } from './adapters/semantic-retriever.adapter'
import { LexicalRetriever } from './adapters/lexical-retriever.adapter'
import { HybridRetriever } from './adapters/hybrid-retriever.adapter'
import {
  IRetriever,
  IGraphRetriever,
  ISemanticRetriever,
  ILexicalRetriever,
  IHybridRetriever,
  IVectorStore,
  IEmbeddingService,
  IChunker,
  IContentHasher,
  IIndexingService,
  IIndexingJobQueue,
} from './domain/retrieval.interfaces'
import { GraphModule } from '../graph/graph.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'

/**
 * Retrieval Module — hybrid retrieval system.
 *
 * Provides:
 * - Graph retrieval (via existing Graph Engine)
 * - Semantic retrieval (via pgvector)
 * - Lexical retrieval (via PostgreSQL full-text search)
 * - Hybrid fusion (via Reciprocal Rank Fusion)
 * - Indexing pipeline (via BullMQ)
 * - Authorization integration
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'retrieval-indexing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    }),
    forwardRef(() => GraphModule),
    forwardRef(() => KnowledgeModule),
    forwardRef(() => AuthModule),
    DatabaseModule,
  ],
  controllers: [RetrievalController],
  providers: [
    // Main service
    {
      provide: IRetriever,
      useClass: RetrievalService,
    },
    RetrievalService,

    // Retriever adapters
    {
      provide: IGraphRetriever,
      useClass: GraphRetriever,
    },
    {
      provide: ISemanticRetriever,
      useClass: SemanticRetriever,
    },
    {
      provide: ILexicalRetriever,
      useClass: LexicalRetriever,
    },
    {
      provide: IHybridRetriever,
      useClass: HybridRetriever,
    },

    // Vector store
    {
      provide: IVectorStore,
      useClass: VectorStoreService,
    },

    // Embedding service
    {
      provide: IEmbeddingService,
      useClass: EmbeddingService,
    },

    // Chunking
    {
      provide: IChunker,
      useClass: ChunkerService,
    },
    {
      provide: IContentHasher,
      useClass: ContentHasher,
    },

    // Indexing
    IndexingService,
    {
      provide: IIndexingService,
      useExisting: IndexingService,
    },
    {
      provide: IIndexingJobQueue,
      useClass: IndexingJobQueue,
    },
    IndexingProcessor,
  ],
  exports: [
    IRetriever,
    RetrievalService,
    IHybridRetriever,
    IVectorStore,
    IEmbeddingService,
    IChunker,
    IContentHasher,
    IIndexingService,
    IIndexingJobQueue,
  ],
})
export class RetrievalModule {}
