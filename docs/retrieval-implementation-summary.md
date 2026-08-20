# Phase 12 Implementation Summary — Hybrid RAG & Semantic Retrieval

## Overview

Phase 12 adds a production-grade semantic retrieval layer to ContextGraph, enabling discovery of knowledge that may not be directly reachable through graph traversal alone.

## Architecture

The retrieval system combines three retrieval methods:

1. **Graph Retrieval** — BFS traversal via existing Graph Engine
2. **Semantic Retrieval** — Vector similarity search via pgvector
3. **Lexical Retrieval** — PostgreSQL full-text search

Results are fused using **Reciprocal Rank Fusion (RRF)** for deterministic, reproducible ranking.

## Security Model

**Critical**: Semantic retrieval MUST NEVER bypass:

- Authentication
- Organization isolation
- Permissions
- Compliance requirements
- Deterministic rules

```
User Query
   ↓
Authentication
   ↓
Authorization Context
   ↓
Hybrid Retrieval
   ↓
Permission Filtering  ← Security boundary
   ↓
Deterministic Rules
   ↓
Candidate Ranking
   ↓
LLM
```

## Implemented Components

### Core Services

| Service            | File                               | Purpose                              |
| ------------------ | ---------------------------------- | ------------------------------------ |
| RetrievalService   | `services/retrieval.service.ts`    | Main orchestrator with authorization |
| VectorStoreService | `services/vector-store.service.ts` | PostgreSQL + pgvector implementation |
| EmbeddingService   | `services/embedding.service.ts`    | OpenAI/Ollama embedding generation   |
| ChunkerService     | `services/chunker.service.ts`      | Semantic text chunking               |
| IndexingService    | `services/indexing.service.ts`     | Async indexing pipeline              |

### Retriever Adapters

| Adapter           | File                                     | Purpose                   |
| ----------------- | ---------------------------------------- | ------------------------- |
| GraphRetriever    | `adapters/graph-retriever.adapter.ts`    | Graph traversal retrieval |
| SemanticRetriever | `adapters/semantic-retriever.adapter.ts` | Vector similarity search  |
| LexicalRetriever  | `adapters/lexical-retriever.adapter.ts`  | Full-text search          |
| HybridRetriever   | `adapters/hybrid-retriever.adapter.ts`   | RRF fusion                |

### Infrastructure

| Component         | File                             | Purpose              |
| ----------------- | -------------------------------- | -------------------- |
| IndexingProcessor | `jobs/indexing.processor.ts`     | BullMQ job processor |
| IndexingJobQueue  | `jobs/indexing-queue.service.ts` | Job queue management |

## API Endpoints

### POST /api/v1/retrieval/search

Execute hybrid retrieval search.

**Request**:

```json
{
  "userQuery": "What is the clinical safety policy?",
  "workspaceId": "ws-1",
  "entryNodeId": "node-1",
  "mode": "HYBRID",
  "graphTopK": 20,
  "semanticTopK": 20,
  "lexicalTopK": 20,
  "finalTopK": 50,
  "enableGraph": true,
  "enableSemantic": true,
  "enableLexical": true,
  "semanticWeight": 1.0,
  "graphWeight": 1.0,
  "lexicalWeight": 1.0,
  "minSimilarity": 0.5
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "candidates": [...],
    "mode": "HYBRID",
    "totalResults": 25,
    "graphResults": [...],
    "semanticResults": [...],
    "lexicalResults": [...],
    "fusionMetadata": {
      "strategy": "RRF",
      "graphWeight": 1.0,
      "semanticWeight": 1.0,
      "lexicalWeight": 1.0,
      "totalCandidates": 60,
      "fusedCandidates": 25
    },
    "metrics": {
      "queryLatencyMs": 150,
      "embeddingLatencyMs": 50,
      "vectorSearchLatencyMs": 30,
      "lexicalSearchLatencyMs": 20,
      "graphRetrievalLatencyMs": 40,
      "fusionLatencyMs": 10,
      "authorizationLatencyMs": 5,
      "ruleFilteringLatencyMs": 5,
      "finalCandidateCount": 25,
      "cacheHitRate": 0
    }
  }
}
```

## Reciprocal Rank Fusion (RRF)

The hybrid retriever uses RRF to combine results:

```
score(d) = Σ w_i * 1/(k + rank_i(d))
```

Where:

- `d` = document/candidate
- `k` = constant (60, standard value from literature)
- `w_i` = weight for retrieval method i
- `rank_i(d)` = rank of document d in result list i (1-indexed)

## Database Schema

### vector_chunks

```sql
CREATE TABLE vector_chunks (
  chunk_id VARCHAR(32) PRIMARY KEY,
  node_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  workspace_id VARCHAR(36) NOT NULL,
  embedding vector(1536),
  embedding_model VARCHAR(100),
  embedding_version VARCHAR(50),
  content_hash VARCHAR(32),
  content TEXT,
  title TEXT,
  type VARCHAR(50),
  status VARCHAR(50),
  importance FLOAT,
  department_id VARCHAR(36),
  compliance_tags TEXT[],
  chunk_index INTEGER,
  total_chunks INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- HNSW index for approximate nearest neighbor search
CREATE INDEX idx_vector_chunks_embedding
  ON vector_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Organization index for tenant isolation
CREATE INDEX idx_vector_chunks_organization
  ON vector_chunks (organization_id);

-- Node index for deletion
CREATE INDEX idx_vector_chunks_node
  ON vector_chunks (node_id);
```

### index_status

```sql
CREATE TABLE index_status (
  node_id VARCHAR(36) PRIMARY KEY,
  status VARCHAR(50),
  last_indexed_at TIMESTAMP,
  embedding_model VARCHAR(100),
  embedding_version VARCHAR(50),
  content_hash VARCHAR(32),
  chunk_count INTEGER,
  error TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Configuration

### Environment Variables

```bash
# Embedding Configuration
EMBEDDING_PROVIDER=OPENAI
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EMBEDDING_BATCH_SIZE=100
EMBEDDING_TIMEOUT=30000

# OpenAI
OPENAI_API_KEY=your-key
OPENAI_API_URL=https://api.openai.com/v1

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
```

## Validation Results

| Check      | Status        |
| ---------- | ------------- |
| TypeScript | ✅ Clean      |
| ESLint     | ✅ Clean      |
| Tests      | ✅ 394 passed |
| Build      | ✅ Successful |

## Files Created

```
apps/api/src/modules/retrieval/
├── domain/
│   ├── retrieval.types.ts
│   └── retrieval.interfaces.ts
├── services/
│   ├── retrieval.service.ts
│   ├── vector-store.service.ts
│   ├── embedding.service.ts
│   ├── chunker.service.ts
│   ├── indexing.service.ts
│   └── retrieval.service.spec.ts
├── adapters/
│   ├── graph-retriever.adapter.ts
│   ├── semantic-retriever.adapter.ts
│   ├── lexical-retriever.adapter.ts
│   └── hybrid-retriever.adapter.ts
├── jobs/
│   ├── indexing.processor.ts
│   └── indexing-queue.service.ts
├── controllers/
│   └── retrieval.controller.ts
├── dto/
│   └── search-retrieval.dto.ts
└── retrieval.module.ts

docs/
├── retrieval-architecture.md
└── retrieval-implementation-summary.md
```

## Future Enhancements

1. **Embedding Versioning**: Track embedding model versions
2. **Reindexing Workflow**: Background reindex with zero downtime
3. **Caching**: Redis caching for frequent queries
4. **Query Transformation**: AI-powered query expansion
5. **Evaluation Framework**: Precision@K, Recall@K, MRR, NDCG
6. **Additional Providers**: Pinecone, Qdrant, Weaviate
