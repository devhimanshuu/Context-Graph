import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { IngestionController } from './controllers/ingestion.controller'
import { IngestionService } from './services/ingestion.service'
import { FileValidatorService } from './services/file-validator.service'
import { SecurityScannerService } from './services/security-scanner.service'
import { LocalObjectStorage } from './services/object-storage.service'
import { ContentExtractorService } from './services/content-extractor.service'
import { ContentNormalizerService } from './services/content-normalizer.service'
import { DocumentChunkerService } from './services/document-chunker.service'
import { MetadataExtractorService } from './services/metadata-extractor.service'
import { KnowledgeNodeCreatorService } from './services/knowledge-node-creator.service'
import { GraphRelationshipDetectorService } from './services/graph-relationship-detector.service'
import { IngestionEmbeddingOrchestrator } from './services/ingestion-embedding-orchestrator.service'
import { IngestionVectorIndexer } from './services/ingestion-vector-indexer.service'
import { IngestionJobQueue } from './jobs/ingestion-queue.service'
import { IngestionProcessor } from './jobs/ingestion.processor'
import { DocumentPrismaRepository } from './repositories/document.repository'
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
  IIngestionService,
  IIngestionJobQueue,
} from './domain/ingestion.interfaces'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { GraphModule } from '../graph/graph.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'

/**
 * Ingestion Module — document ingestion and processing.
 *
 * Provides:
 * - Document upload and validation
 * - Content extraction
 * - Content normalization
 * - Document chunking
 * - Metadata extraction
 * - Knowledge node creation
 * - Graph relationship detection
 * - Async processing via BullMQ
 * - Document lifecycle management
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ingestion',
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
    forwardRef(() => KnowledgeModule),
    forwardRef(() => GraphModule),
    forwardRef(() => RetrievalModule),
    forwardRef(() => AuthModule),
    DatabaseModule,
  ],
  controllers: [IngestionController],
  providers: [
    // Main service
    {
      provide: IIngestionService,
      useClass: IngestionService,
    },
    IngestionService,

    // Repository
    {
      provide: IDocumentRepository,
      useClass: DocumentPrismaRepository,
    },

    // Storage
    {
      provide: IObjectStorage,
      useClass: LocalObjectStorage,
    },

    // Validation
    {
      provide: IFileValidator,
      useClass: FileValidatorService,
    },
    {
      provide: IFileSecurityScanner,
      useClass: SecurityScannerService,
    },

    // Extraction
    {
      provide: IContentExtractor,
      useClass: ContentExtractorService,
    },

    // Normalization
    {
      provide: IContentNormalizer,
      useClass: ContentNormalizerService,
    },

    // Chunking
    {
      provide: IDocumentChunker,
      useClass: DocumentChunkerService,
    },

    // Metadata
    {
      provide: IMetadataExtractor,
      useClass: MetadataExtractorService,
    },

    // Knowledge
    {
      provide: IKnowledgeNodeCreator,
      useClass: KnowledgeNodeCreatorService,
    },

    // Graph
    {
      provide: IGraphRelationshipDetector,
      useClass: GraphRelationshipDetectorService,
    },

    // Embedding & Vector Indexing (integrated with RetrievalModule)
    {
      provide: IIngestionEmbeddingOrchestrator,
      useClass: IngestionEmbeddingOrchestrator,
    },
    {
      provide: IIngestionVectorIndexer,
      useClass: IngestionVectorIndexer,
    },

    // Jobs
    {
      provide: IIngestionJobQueue,
      useClass: IngestionJobQueue,
    },
    IngestionProcessor,
  ],
  exports: [
    IIngestionService,
    IngestionService,
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
  ],
})
export class IngestionModule {}
