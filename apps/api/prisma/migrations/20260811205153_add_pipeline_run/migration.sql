-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "actorId" UUID,
    "requestId" TEXT NOT NULL,
    "packageId" TEXT,
    "version" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "entryNodeId" TEXT NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "tokenBudget" INTEGER NOT NULL,
    "maxCandidates" INTEGER NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "failedStageId" TEXT,
    "request" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "metrics" JSONB,
    "candidates" JSONB,
    "exclusions" JSONB,
    "error" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_requestId_key" ON "PipelineRun"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_packageId_key" ON "PipelineRun"("packageId");

-- CreateIndex
CREATE INDEX "PipelineRun_organizationId_createdAt_idx" ON "PipelineRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PipelineRun_organizationId_workspaceId_createdAt_idx" ON "PipelineRun"("organizationId", "workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PipelineRun_requestId_idx" ON "PipelineRun"("requestId");

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
