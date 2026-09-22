-- CreateExtension: enable pgvector for the VectorChunk table
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "VectorChunk" (
    "id" UUID NOT NULL,
    "chunkId" TEXT NOT NULL,
    "nodeId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "embedding" vector(1536),
    "embeddingModel" TEXT NOT NULL,
    "embeddingVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "departmentId" UUID,
    "complianceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "totalChunks" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectorChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VectorChunk_chunkId_key" ON "VectorChunk"("chunkId");

-- CreateIndex
CREATE INDEX "VectorChunk_organizationId_idx" ON "VectorChunk"("organizationId");

-- CreateIndex
CREATE INDEX "VectorChunk_workspaceId_idx" ON "VectorChunk"("workspaceId");

-- CreateIndex
CREATE INDEX "VectorChunk_nodeId_idx" ON "VectorChunk"("nodeId");

-- CreateIndex
CREATE INDEX "VectorChunk_organizationId_contentHash_idx" ON "VectorChunk"("organizationId", "contentHash");

-- ANN index for cosine similarity search (HNSW).
CREATE INDEX "VectorChunk_embedding_hnsw_idx" ON "VectorChunk" USING hnsw ("embedding vector_cosine_ops");

-- AlterTable: add password hash column for API credential login
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
