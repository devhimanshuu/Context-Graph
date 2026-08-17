-- AlterTable
ALTER TABLE "PipelineRun" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_organizationId_idempotencyKey_key" ON "PipelineRun"("organizationId", "idempotencyKey");
