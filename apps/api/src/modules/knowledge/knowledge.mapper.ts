import type { ComplianceTag, KnowledgeNode } from '@prisma/client'
import { type EntityId, type Metadata, type NodeStatus, type NodeType } from '@contextgraph/types'
import { KnowledgeNodeEntity } from './knowledge.entity'
import { type KnowledgeNodeResponseDto } from './knowledge.dto'
import {
  type CreateKnowledgeNodeInput,
  type UpdateKnowledgeNodeInput,
} from './knowledge.validation'
import {
  ResourceVisibility,
  type ResourceAuthorizationContext,
} from '../authorization/domain/resource-context'

/** Metadata key a node may carry to override the default INTERNAL visibility. */
const VISIBILITY_METADATA_KEY = 'visibility'

/**
 * The minimal node shape the authorization mapper needs. Satisfied by the
 * domain entity (reads) and by prospective node objects (create/update), so
 * write paths can authorize a node before it is persisted.
 */
export interface KnowledgeNodeAuthSource {
  id: EntityId
  organizationId: EntityId
  workspaceId: EntityId
  departmentId: EntityId | null
  createdById: EntityId | null
  complianceTags: readonly ComplianceTag[]
  metadata: Metadata
  status: NodeStatus
  type: NodeType
}

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

/**
 * Maps a node (existing entity or prospective create/update state) into the
 * authorization engine's resource shape so the same policies (organization,
 * department, compliance, visibility) gate node reads AND writes. Visibility
 * comes from node metadata (validated) and defaults to INTERNAL;
 * `requiredPermissionLevel` is intentionally null — nodes carry no
 * stricter-than-default level today.
 */
export function knowledgeNodeToResourceContext(
  source: KnowledgeNodeAuthSource,
): ResourceAuthorizationContext {
  return {
    id: source.id,
    resourceType: 'knowledge-node',
    organizationId: source.organizationId,
    workspaceId: source.workspaceId,
    departmentId: source.departmentId,
    ownerId: source.createdById,
    requiredPermissionLevel: null,
    complianceTags: [...source.complianceTags],
    visibility: resolveVisibility(source.metadata),
    status: source.status,
    attributes: { type: source.type },
  }
}

/** Reads `metadata.visibility`, dropping unknown values (fail-safe default INTERNAL). */
function resolveVisibility(metadata: Metadata): ResourceVisibility {
  const value = metadata[VISIBILITY_METADATA_KEY]
  if (value === ResourceVisibility.PUBLIC || value === ResourceVisibility.PRIVATE) {
    return value
  }
  return ResourceVisibility.INTERNAL
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

/**
 * Maps an update input into the Prisma shape. `complianceTags` is a relation
 * (not a scalar list), so an update must replace the join rows — Prisma rejects
 * a raw tag array. Fields not provided stay `undefined` and are left untouched.
 */
export function updateKnowledgeNodeInputToPrisma(
  input: UpdateKnowledgeNodeInput,
  actorId: string,
): Record<string, unknown> {
  const { complianceTags, ...rest } = input
  return {
    ...rest,
    updatedById: actorId,
    complianceTags:
      complianceTags === undefined
        ? undefined
        : {
            deleteMany: {},
            create: complianceTags.map((tag) => ({ tag })),
          },
  }
}
