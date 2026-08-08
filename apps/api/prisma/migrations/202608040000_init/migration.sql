-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('HEALTHCARE', 'FINANCE', 'LEGAL', 'TECHNOLOGY', 'EDUCATION', 'MANUFACTURING', 'RETAIL', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED', 'LEGAL_HOLD', 'REVIEW_REQUIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SUPPORTS', 'REQUIRES', 'DERIVED_FROM', 'SUPERSEDES', 'CONTRADICTS');

-- CreateEnum
CREATE TYPE "ComplianceTag" AS ENUM ('HIPAA', 'GDPR', 'PCI_DSS', 'SOC2', 'SOX', 'FINRA', 'ISO_27001', 'PHI', 'PII', 'CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NONE', 'READ', 'WRITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ComplianceClearance" AS ENUM ('NONE', 'STANDARD', 'SENSITIVE', 'RESTRICTED', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ContextRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ONBOARDING',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hierarchyLevel" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "departmentId" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissionLevel" "PermissionLevel" NOT NULL DEFAULT 'READ',
    "complianceClearance" "ComplianceClearance" NOT NULL DEFAULT 'STANDARD',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "authProviderUserId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "departmentId" UUID,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "status" "NodeStatus" NOT NULL DEFAULT 'DRAFT',
    "importance" INTEGER NOT NULL DEFAULT 0,
    "derivabilityScore" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNodeComplianceTag" (
    "knowledgeNodeId" UUID NOT NULL,
    "tag" "ComplianceTag" NOT NULL,

    CONSTRAINT "KnowledgeNodeComplianceTag_pkey" PRIMARY KEY ("knowledgeNodeId","tag")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PermissionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionProfileAssignment" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "grantedById" UUID,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PermissionProfileAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextRule" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "ContextRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContextRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workspaceId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_industry_idx" ON "Organization"("industry");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_status_idx" ON "Workspace"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_organizationId_slug_key" ON "Workspace"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Department_organizationId_hierarchyLevel_idx" ON "Department"("organizationId", "hierarchyLevel");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId", "code");

-- CreateIndex
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE INDEX "User_organizationId_permissionLevel_idx" ON "User"("organizationId", "permissionLevel");

-- CreateIndex
CREATE INDEX "User_organizationId_complianceClearance_idx" ON "User"("organizationId", "complianceClearance");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_authProviderUserId_key" ON "User"("organizationId", "authProviderUserId");

-- CreateIndex
CREATE INDEX "KnowledgeNode_organizationId_status_idx" ON "KnowledgeNode"("organizationId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_status_idx" ON "KnowledgeNode"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_type_idx" ON "KnowledgeNode"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_importance_idx" ON "KnowledgeNode"("workspaceId", "importance");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_validFrom_validTo_idx" ON "KnowledgeNode"("workspaceId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_status_validFrom_validTo_idx" ON "KnowledgeNode"("workspaceId", "status", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "KnowledgeNode_departmentId_idx" ON "KnowledgeNode"("departmentId");

-- CreateIndex
CREATE INDEX "KnowledgeNode_createdById_idx" ON "KnowledgeNode"("createdById");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_updatedAt_idx" ON "KnowledgeNode"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeNodeComplianceTag_tag_idx" ON "KnowledgeNodeComplianceTag"("tag");

-- CreateIndex
CREATE INDEX "GraphEdge_workspaceId_sourceId_idx" ON "GraphEdge"("workspaceId", "sourceId");

-- CreateIndex
CREATE INDEX "GraphEdge_workspaceId_targetId_idx" ON "GraphEdge"("workspaceId", "targetId");

-- CreateIndex
CREATE INDEX "GraphEdge_workspaceId_relationshipType_idx" ON "GraphEdge"("workspaceId", "relationshipType");

-- CreateIndex
CREATE INDEX "GraphEdge_workspaceId_relationshipType_validFrom_validTo_idx" ON "GraphEdge"("workspaceId", "relationshipType", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "GraphEdge_organizationId_idx" ON "GraphEdge"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEdge_workspaceId_sourceId_targetId_relationshipType_key" ON "GraphEdge"("workspaceId", "sourceId", "targetId", "relationshipType");

-- CreateIndex
CREATE INDEX "PermissionProfile_organizationId_isDefault_idx" ON "PermissionProfile"("organizationId", "isDefault");

-- CreateIndex
CREATE INDEX "PermissionProfile_workspaceId_idx" ON "PermissionProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionProfile_organizationId_name_key" ON "PermissionProfile"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PermissionProfileAssignment_userId_idx" ON "PermissionProfileAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionProfileAssignment_profileId_userId_key" ON "PermissionProfileAssignment"("profileId", "userId");

-- CreateIndex
CREATE INDEX "ContextRule_organizationId_status_idx" ON "ContextRule"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ContextRule_workspaceId_isEnabled_priority_idx" ON "ContextRule"("workspaceId", "isEnabled", "priority");

-- CreateIndex
CREATE INDEX "ContextRule_workspaceId_validFrom_validTo_idx" ON "ContextRule"("workspaceId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_occurredAt_idx" ON "AuditLog"("organizationId", "entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_actorId_occurredAt_idx" ON "AuditLog"("organizationId", "actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_occurredAt_idx" ON "AuditLog"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_occurredAt_idx" ON "AuditLog"("organizationId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNodeComplianceTag" ADD CONSTRAINT "KnowledgeNodeComplianceTag_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionProfile" ADD CONSTRAINT "PermissionProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionProfile" ADD CONSTRAINT "PermissionProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionProfileAssignment" ADD CONSTRAINT "PermissionProfileAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PermissionProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionProfileAssignment" ADD CONSTRAINT "PermissionProfileAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionProfileAssignment" ADD CONSTRAINT "PermissionProfileAssignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextRule" ADD CONSTRAINT "ContextRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextRule" ADD CONSTRAINT "ContextRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextRule" ADD CONSTRAINT "ContextRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

