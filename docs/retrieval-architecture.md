# Retrieval Architecture

## Overview

ContextGraph implements a production-grade hybrid retrieval system that combines graph, semantic, and lexical retrieval to discover knowledge that may not be directly reachable through the graph alone.

## Architecture

```
User Query
   ↓
Authentication
   ↓
Authorization Context
   ↓
Hybrid Retrieval
   ↓
┌─────────────────┬─────────────────┬─────────────────┐
│ Graph Retrieval │ Semantic Search │ Lexical Search  │
│ (BFS)           │ (pgvector)      │ (PostgreSQL FTS)│
└─────────────────┴─────────────────┴─────────────────┘
         ↓               ↓               ↓
         └───────────────┴───────────────┘
                         ↓
              Reciprocal Rank Fusion (RRF)
                         ↓
              Candidate Discovery
                         ↓
              Permission Filtering
                         ↓
              Deterministic Rules
                         ↓
              Candidate Ranking
                         ↓
              Context Assembly
                         ↓
                    LLM
```

## Security Model

**Critical**: Semantic retrieval MUST NEVER bypass:

- Authentication
- Organization isolation
- Permissions
- Compliance requirements
- Deterministic rules

### Correct Architecture

```
User Query
   ↓
Authentication
   ↓
Authorization Context
   ↓
Hybrid Retrieval
   ↓
Candidate Discovery
   ↓
Permission Filtering  ← Security boundary
   ↓
Deterministic Rules
   ↓
Candidate Ranking
   ↓
Context Assembly
   ↓
LLM
```

### Incorrect Architecture (Never Implement)

```
User Query
   ↓
Vector Search
   ↓
LLM
   ↓
Authorization  ← Too late!
```

## Components

### 1. Graph Retriever

**File**: `adapters/graph-retriever.adapter.ts`

Retrieves nodes via graph traversal using the existing Graph Engine.

- Reuses BFS implementation
- Respects graph distance
- Organization-scoped queries

### 2. Semantic Retriever

**File**: `adapters/semantic-retriever.adapter.ts`

Retrieves nodes via vector similarity search using pgvector.

- Generates embeddings for queries
- Organization-level filtering
- Similarity as retrieval signal, not authorization

### 3. Lexical Retriever

**File**: `adapters/lexical-retriever.adapter.ts`

Retrieves nodes via PostgreSQL full-text search.

- tsvector/tsquery for full-text search
- ts_rank for relevance ranking
- Organization-scoped queries

### 4. Hybrid Retriever

**File**: `adapters/hybrid-retriever.adapter.ts`

Combines all retrieval methods using Reciprocal Rank Fusion.

#### Reciprocal Rank Fusion (RRF)

**Formula**:

```
score(d) = Σ w_i * 1/(k + rank_i(d))
```

Where:

- `d` = document/candidate
- `k` = constant (60, standard value from literature)
- `w_i` = weight for retrieval method i
- `rank_i(d)` = rank of document d in result list i (1-indexed)

**Example**:

```
Document A:
  Graph rank: 2, Weight: 1.0 → 1.0 / (60 + 2) = 0.0161
  Semantic rank: 5, Weight: 1.0 → 1.0 / (60 + 5) = 0.0154
  Lexical rank: 1, Weight: 1.0 → 1.0 / (60 + 1) = 0.0164
  Total score: 0.0479

Document B:
  Graph rank: 1, Weight: 1.0 → 1.0 / (60 + 1) = 0.0164
  Semantic rank: 3, Weight: 1.0 → 1.0 / (60 + 3) = 0.0159
  Lexical rank: 10, Weight: 1.0 → 1.0 / (60 + 10) = 0.0143
  Total score: 0.0466
```

### 5. Vector Store

**File**: `services/vector-store.service.ts`

PostgreSQL + pgvector implementation for vector similarity search.

- HNSW index for approximate nearest neighbor search
- Organization-scoped queries
- Cosine similarity

### 6. Embedding Service

**File**: `services/embedding.service.ts`

Generates text embeddings for semantic search.

**Providers**:

- OpenAI (text-embedding-3-small, text-embedding-3-large)
- Ollama (local models)

**Features**:

- Batch embedding generation
- Retry with exponential backoff
- Provider-agnostic abstraction

### 7. Chunker

**File**: `services/chunker.service.ts`

Splits text into semantically meaningful chunks.

**Features**:

- Configurable chunk size and overlap
- Sentence boundary preservation
- Paragraph boundary preservation
- Metadata preservation
- Deterministic chunk IDs

### 8. Indexing Service

**File**: `services/indexing.service.ts`

Orchestrates the indexing pipeline for knowledge nodes.

**Pipeline**:

```
Knowledge Node
   ↓
Validate
   ↓
Chunk
   ↓
Hash
   ↓
Generate Embeddings
   ↓
Store Vectors
   ↓
Mark Indexed
```

**Features**:

- Async indexing via BullMQ
- Idempotent operations
- Content hash detection (skip unchanged)
- Embedding versioning

## API

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

## Configuration

### Environment Variables

```env
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

### Retrieval Configuration

```typescript
const configuration = {
  enableGraph: true,
  enableSemantic: true,
  enableLexical: true,
  semanticWeight: 1.0,
  graphWeight: 1.0,
  lexicalWeight: 1.0,
  minSimilarity: 0.5,
};
```

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

## Testing

### Unit Tests

```bash
cd apps/api
npm run test -- retrieval
```

### Test Coverage

- RetrievalService: Authorization filtering, cross-tenant protection
- HybridRetriever: RRF fusion, parallel retrieval
- GraphRetriever: Graph traversal integration
- SemanticRetriever: Vector search integration
- LexicalRetriever: Full-text search
- IndexingService: Pipeline orchestration

### Security Tests

1. **Cross-tenant retrieval**: Verify organization filtering
2. **Unauthorized access**: Verify authentication required
3. **Stale vectors**: Verify content hash detection
4. **Deleted documents**: Verify vector deletion

## Performance

### Benchmarks

| Operation           | 1K vectors | 10K vectors | 100K vectors |
| ------------------- | ---------- | ----------- | ------------ |
| Vector search       | ~10ms      | ~20ms       | ~50ms        |
| Hybrid retrieval    | ~100ms     | ~150ms      | ~200ms       |
| Indexing (per node) | ~500ms     | ~500ms      | ~500ms       |

### Optimization

- HNSW index for approximate nearest neighbor search
- Parallel retrieval from all sources
- Batch embedding generation
- Content hash detection (skip unchanged)
- Organization-scoped queries

## Future Enhancements

1. **Embedding Versioning**: Track embedding model versions
2. **Reindexing Workflow**: Background reindex with zero downtime
3. **Caching**: Redis caching for frequent queries
4. **Query Transformation**: AI-powered query expansion
5. **Evaluation Framework**: Precision@K, Recall@K, MRR, NDCG
6. **Additional Providers**: Pinecone, Qdrant, Weaviate
