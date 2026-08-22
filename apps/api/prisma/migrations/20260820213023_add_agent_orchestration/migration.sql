-- CreateEnum
CREATE TYPE "IngestionDocumentStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'QUEUED', 'EXTRACTING', 'EXTRACTED', 'NORMALIZING', 'NORMALIZED', 'CHUNKING', 'CHUNKED', 'INDEXING', 'INDEXED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED', 'STALE');

-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('FILE', 'URL', 'TEXT', 'API');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PUBLIC');

-- CreateEnum
CREATE TYPE "IngestionJobType" AS ENUM ('VALIDATE', 'EXTRACT', 'NORMALIZE', 'CHUNK', 'METADATA', 'KNOWLEDGE', 'GRAPH', 'EMBED', 'INDEX', 'PUBLISH', 'REPROCESS');

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "AgentExecutionStatusEnum" AS ENUM ('PENDING', 'INITIALIZING', 'PLANNING', 'REQUESTING_CONTEXT', 'EXECUTING_TOOL', 'OBSERVING', 'VERIFYING', 'GENERATING_RESPONSE', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT', 'POLICY_BLOCKED');

-- CreateEnum
CREATE TYPE "AgentStepTypeEnum" AS ENUM ('CONTEXT_REQUEST', 'TOOL_CALL', 'ANALYSIS', 'VERIFICATION', 'FINAL_RESPONSE');

-- CreateEnum
CREATE TYPE "AgentStepStatusEnum" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ToolCallStatusEnum" AS ENUM ('PENDING', 'VALIDATING', 'AUTHORIZING', 'EXECUTING', 'COMPLETED', 'FAILED', 'DENIED', 'TIMEOUT', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "departmentId" UUID,
    "uploadedById" UUID,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "IngestionDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'FILE',
    "sourceUrl" TEXT,
    "storagePath" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processingMetadata" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'ORGANIZATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storagePath" TEXT,
    "size" INTEGER NOT NULL,
    "status" "IngestionDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "processingMetadata" JSONB NOT NULL DEFAULT '{}',
    "embeddingModel" TEXT,
    "embeddingVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "chunkId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "totalChunks" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "section" TEXT,
    "subsection" TEXT,
    "page" INTEGER,
    "contentHash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "IngestionJobType" NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userRequest" TEXT NOT NULL,
    "status" "AgentExecutionStatusEnum" NOT NULL DEFAULT 'PENDING',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "iterationCount" INTEGER NOT NULL DEFAULT 0,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalResponse" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentStep" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "stepType" "AgentStepTypeEnum" NOT NULL,
    "purpose" TEXT NOT NULL,
    "toolName" TEXT,
    "status" "AgentStepStatusEnum" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "status" "ToolCallStatusEnum" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "policyDecision" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentObservation" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVerification" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PASSED',
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentApprovalRequest" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "toolName" TEXT NOT NULL DEFAULT '',
    "toolInput" JSONB NOT NULL DEFAULT '{}',
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" UUID,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AgentApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_organizationId_status_idx" ON "Document"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Document_workspaceId_status_idx" ON "Document"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Document_departmentId_idx" ON "Document"("departmentId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_workspaceId_createdAt_idx" ON "Document"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_organizationId_checksum_key" ON "Document"("organizationId", "checksum");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_isActive_idx" ON "DocumentVersion"("documentId", "isActive");

-- CreateIndex
CREATE INDEX "DocumentVersion_organizationId_idx" ON "DocumentVersion"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_chunkId_key" ON "DocumentChunk"("chunkId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_versionId_idx" ON "DocumentChunk"("documentId", "versionId");

-- CreateIndex
CREATE INDEX "DocumentChunk_organizationId_idx" ON "DocumentChunk"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentChunk_workspaceId_idx" ON "DocumentChunk"("workspaceId");

-- CreateIndex
CREATE INDEX "DocumentChunk_organizationId_contentHash_idx" ON "DocumentChunk"("organizationId", "contentHash");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_chunkIndex_idx" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "IngestionJob_documentId_status_idx" ON "IngestionJob"("documentId", "status");

-- CreateIndex
CREATE INDEX "IngestionJob_organizationId_status_idx" ON "IngestionJob"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IngestionJob_workspaceId_status_idx" ON "IngestionJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "IngestionJob_status_type_createdAt_idx" ON "IngestionJob"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionJob_userId_idx" ON "IngestionJob"("userId");

-- CreateIndex
CREATE INDEX "AgentExecution_organizationId_status_idx" ON "AgentExecution"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentExecution_userId_status_idx" ON "AgentExecution"("userId", "status");

-- CreateIndex
CREATE INDEX "AgentExecution_workspaceId_status_idx" ON "AgentExecution"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AgentExecution_createdAt_idx" ON "AgentExecution"("createdAt");

-- CreateIndex
CREATE INDEX "AgentStep_executionId_idx" ON "AgentStep"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentStep_executionId_stepIndex_key" ON "AgentStep"("executionId", "stepIndex");

-- CreateIndex
CREATE INDEX "AgentToolCall_executionId_idx" ON "AgentToolCall"("executionId");

-- CreateIndex
CREATE INDEX "AgentToolCall_stepId_idx" ON "AgentToolCall"("stepId");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_idx" ON "AgentToolCall"("toolName");

-- CreateIndex
CREATE INDEX "AgentObservation_executionId_idx" ON "AgentObservation"("executionId");

-- CreateIndex
CREATE INDEX "AgentObservation_stepId_idx" ON "AgentObservation"("stepId");

-- CreateIndex
CREATE INDEX "AgentVerification_executionId_idx" ON "AgentVerification"("executionId");

-- CreateIndex
CREATE INDEX "AgentVerification_stepId_idx" ON "AgentVerification"("stepId");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_executionId_idx" ON "AgentApprovalRequest"("executionId");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_status_idx" ON "AgentApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_reviewerId_idx" ON "AgentApprovalRequest"("reviewerId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentObservation" ADD CONSTRAINT "AgentObservation_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentObservation" ADD CONSTRAINT "AgentObservation_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVerification" ADD CONSTRAINT "AgentVerification_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVerification" ADD CONSTRAINT "AgentVerification_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApprovalRequest" ADD CONSTRAINT "AgentApprovalRequest_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
