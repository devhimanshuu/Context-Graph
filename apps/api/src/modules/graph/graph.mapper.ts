import type { GraphEdge } from '@prisma/client'
import { GraphEdgeEntity } from './graph-edge.entity'
import type { GraphEdge as DomainGraphEdge } from './domain/graph-edge'
import type { GraphNode } from './domain/graph-node'
import type { NodeProjection } from './graph.repository'

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

/** Maps a persistence entity to the traversal-engine domain edge. */
export function graphEdgeEntityToDomain(edge: GraphEdgeEntity): DomainGraphEdge {
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relationshipType: edge.relationshipType,
    weight: edge.weight,
  }
}

/** Maps a repository node projection to the traversal-engine domain node. */
export function nodeProjectionToDomain(node: NodeProjection): GraphNode {
  return {
    id: node.id,
    title: node.title,
    type: node.type,
    status: node.status,
  }
}
