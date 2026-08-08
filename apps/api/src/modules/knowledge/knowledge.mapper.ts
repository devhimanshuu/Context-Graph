import type { ComplianceTag, KnowledgeNode } from '@prisma/client'
import { KnowledgeNodeEntity } from './knowledge.entity'
import { type KnowledgeNodeResponseDto } from './knowledge.dto'
import { type CreateKnowledgeNodeInput } from './knowledge.validation'

export function prismaKnowledgeNodeToEntity(
  row: KnowledgeNode & { complianceTags?: { tag: ComplianceTag }[] },
): KnowledgeNodeEntity {
  return new KnowledgeNodeEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.departmentId,
    row.title,
    row.content,
    row.type,
    row.status,
    row.importance,
    row.derivabilityScore,
    row.version,
    row.validFrom?.toISOString() ?? null,
    row.validTo?.toISOString() ?? null,
    (row.complianceTags ?? []).map((entry) => entry.tag),
    row.metadata as Record<string, unknown>,
    row.createdById,
    row.updatedById,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

export function entityToKnowledgeNodeResponse(
  entity: KnowledgeNodeEntity,
): KnowledgeNodeResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    departmentId: entity.departmentId,
    title: entity.title,
    content: entity.content,
    type: entity.type,
    status: entity.status,
    importance: entity.importance,
    derivabilityScore: entity.derivabilityScore,
    version: entity.version,
    validFrom: entity.validFrom,
    validTo: entity.validTo,
    complianceTags: entity.complianceTags,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

export function createKnowledgeNodeInputToPrisma(
  input: CreateKnowledgeNodeInput,
  organizationId: string,
  workspaceId: string,
  actorId: string,
): Record<string, unknown> {
  return {
    organizationId,
    workspaceId,
    title: input.title,
    content: input.content,
    type: input.type,
    status: input.status,
    importance: input.importance,
    derivabilityScore: input.derivabilityScore,
    validFrom: input.validFrom,
    validTo: input.validTo,
    departmentId: input.departmentId ?? null,
    metadata: input.metadata,
    createdById: actorId,
    updatedById: actorId,
    complianceTags: {
      create: (input.complianceTags ?? []).map((tag) => ({ tag })),
    },
  }
}
