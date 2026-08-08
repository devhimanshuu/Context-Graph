import type { GraphEdge } from '@prisma/client'
import { GraphEdgeEntity } from './graph-edge.entity'

export function prismaGraphEdgeToEntity(row: GraphEdge): GraphEdgeEntity {
  return new GraphEdgeEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.sourceId,
    row.targetId,
    row.relationshipType,
    row.weight,
    row.validFrom?.toISOString() ?? null,
    row.validTo?.toISOString() ?? null,
    row.metadata as Record<string, unknown>,
    row.createdById,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}
