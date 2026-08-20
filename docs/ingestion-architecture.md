# ContextGraph — Ingestion Architecture

## Overview

The Ingestion Module provides a production-grade document processing pipeline that transforms uploaded knowledge into validated graph nodes, searchable chunks, vector embeddings, and production-ready retrieval data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Upload API                           │
│  POST /api/v1/ingestion/documents                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Validation Layer                             │
│  • File validation (size, type, extension)                       │
│  • Security scanning (malware, injection)                        │
│  • Duplicate detection (content hash)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Layer                                │
│  • Object storage (S3 / local filesystem)                        │
│  • Organization-aware paths                                      │
│  • Content checksum                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Async Processing Pipeline                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Extract │→ │ Normalize│→ │  Chunk   │→ │ Metadata │        │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       │                                                   │      │
│       ▼                                                   ▼      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Knowledge │→ │  Graph   │→ │ Embedding│→ │ Indexing │        │
│  │ Creation │  │Relations │  │Generation│  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Published Knowledge                          │
│  • Knowledge nodes in graph                                      │
│  • Searchable chunks                                             │
│  • Vector embeddings                                             │
│  • Graph relationships                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### 1. Validation

Validates uploaded files before processing:

- **File Size**: Configurable maximum (default 50MB)
- **Content Type**: PDF, DOCX, TXT, Markdown, HTML, JSON
- **Extension**: Validates file extension matches content type
- **Security**: Scans for malicious patterns

### 2. Storage

Stores original files with organization-aware paths:

```
organizations/{orgId}/documents/{docId}/original/{filename}
```

Supports:

- Local filesystem (development)
- AWS S3 (production)

### 3. Extraction

Extracts text content from various formats:

| Format   | Method                        | Production Library |
| -------- | ----------------------------- | ------------------ |
| TXT      | Direct read                   | —                  |
| Markdown | Parse headings, sections      | —                  |
| HTML     | Strip tags, extract structure | —                  |
| PDF      | Simplified extraction         | pdf-parse          |
| DOCX     | XML text extraction           | mammoth            |
| JSON     | Parse and stringify           | —                  |

### 4. Normalization

Normalizes extracted content:

- Unicode normalization (NFC)
- Whitespace normalization
- Line break normalization
- Remove repeated headers/footers
- Clean extraction artifacts

### 5. Chunking

Splits content into retrieval-ready chunks:

- **Section-based**: Uses document structure
- **Fixed-size**: Splits by character count
- **Hybrid**: Combines both strategies

Each chunk preserves:

- Document ID and version
- Organization and workspace
- Section and page information
- Content hash

### 6. Metadata Extraction

Deterministic metadata extraction:

- Title
- Author (if available)
- Document type
- Tags (based on content)
- Dates
- Language
- Word count

### 7. Knowledge Node Creation

Creates knowledge graph nodes:

- **DOCUMENT**: Top-level document node
- **SECTION**: Major section nodes
- **CONCEPT**: Key concept nodes

### 8. Graph Relationship Detection

Creates deterministic relationships:

- DOCUMENT_CONTAINS_SECTION
- SECTION_CONTAINS_CHUNK
- DOCUMENT_BELONGS_TO_DEPARTMENT
- NODE_DERIVED_FROM_DOCUMENT
- NODE_RELATED_TO_TOPIC

### 9. Embedding Generation

Generates vector embeddings for semantic search:

- Integrates with Phase 12 EmbeddingService
- Supports batching
- Tracks embedding version

### 10. Vector Indexing

Stores embeddings in pgvector:

- Organization-aware vectors
- Content hash for deduplication
- Embedding version tracking

## Document Lifecycle

```
UPLOADED → QUEUED → EXTRACTING → EXTRACTED → NORMALIZING → NORMALIZED
    ↓
CHUNKING → CHUNKED → INDEXING → INDEXED → READY
    ↓
ARCHIVED / FAILED / STALE
```

## API Endpoints

### Upload Document

```http
POST /api/v1/ingestion/documents
Content-Type: application/json

{
  "filename": "policy.pdf",
  "content": "<base64-encoded-content>",
  "contentType": "application/pdf",
  "workspaceId": "ws-123",
  "departmentId": "dept-456",
  "tags": ["policy", "compliance"],
  "visibility": "ORGANIZATION"
}
```

### List Documents

```http
GET /api/v1/ingestion/documents?workspaceId=ws-123
```

### Get Document

```http
GET /api/v1/ingestion/documents/:id
```

### Get Document Status

```http
GET /api/v1/ingestion/documents/:id/status
```

### Reprocess Document

```http
POST /api/v1/ingestion/documents/:id/reprocess
```

### Archive Document

```http
POST /api/v1/ingestion/documents/:id/archive
```

### Delete Document

```http
DELETE /api/v1/ingestion/documents/:id
```

## Security

### File Validation

- Maximum file size limit
- Supported content types only
- Path traversal detection
- Suspicious pattern detection

### Security Scanning

- Malicious signature detection
- Executable pattern detection
- Polyglot file detection
- Zip bomb detection

### Tenant Isolation

- Organization-scoped storage paths
- Authorization checks on all operations
- Worker-level organization context
- No cross-tenant document access

### Content Treatment

- All uploaded content is treated as untrusted
- No script execution during ingestion
- Sanitized content before indexing

## Configuration

### Environment Variables

```env
# Storage
STORAGE_PATH=./storage/documents
STORAGE_TYPE=local  # local | s3

# File Limits
MAX_FILE_SIZE=52428800  # 50MB

# Processing
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Queue
INGESTION_CONCURRENCY=3
INGESTION_RATE_LIMIT=5
```

## Integration Points

### Graph Engine

- Creates knowledge nodes via KnowledgeModule
- Creates relationships via GraphModule
- Validates graph invariants

### Retrieval System

- Integrates with EmbeddingService
- Integrates with VectorStore
- Supports hybrid retrieval

### Authorization

- Uses AuthorizationModule for access control
- Enforces organization isolation
- Records audit events

## Testing

### Unit Tests

- File validator tests
- Content extractor tests
- Document chunker tests
- Metadata extractor tests

### Integration Tests

- Full ingestion pipeline
- Storage integration
- Queue processing

### Security Tests

- Cross-tenant upload prevention
- Malicious file handling
- Authorization enforcement

## Performance

### Benchmarks

- Small document (< 1MB): ~2-5 seconds
- Medium document (1-10MB): ~10-30 seconds
- Large document (10-50MB): ~30-120 seconds

### Optimization

- Async processing via BullMQ
- Configurable concurrency
- Content hash deduplication
- Embedding version tracking

## Production Considerations

### S3 Storage

For production deployments, replace LocalObjectStorage with S3ObjectStorage:

```typescript
{
  provide: IObjectStorage,
  useClass: S3ObjectStorage,
}
```

### PDF/DOCX Extraction

For production PDF and DOCX extraction, integrate dedicated libraries:

```bash
npm install pdf-parse mammoth
```

### Embedding Providers

Configure embedding providers for vector generation:

- OpenAI (text-embedding-3-small)
- Ollama (local development)
- Custom providers
