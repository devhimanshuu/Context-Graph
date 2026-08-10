import type { GraphEdge } from '@prisma/client'
import type { EntityId, Metadata } from '@contextgraph/types'
import { GraphEdgeEntity } from './graph-edge.entity'
import type { GraphEdge as DomainGraphEdge } from './domain/graph-edge'
import type { GraphNode } from './domain/graph-node'
import {
  ResourceVisibility,
  type ResourceAuthorizationContext,
} from '../authorization/domain/resource-context'
import type { NodeProjection } from './graph.repository'

/** Metadata key a node may carry to override the default INTERNAL visibility. */
const VISIBILITY_METADATA_KEY = 'visibility'

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

/**
 * Maps a node projection into the authorization engine's resource shape so the
 * reachability result can be filtered with the same policies as node reads.
 * Visibility comes from node metadata (validated) and defaults to INTERNAL.
 */
export function nodeProjectionToResourceContext(
  node: NodeProjection,
  organizationId: EntityId,
): ResourceAuthorizationContext {
  return {
    id: node.id,
    resourceType: 'knowledge-node',
    organizationId,
    departmentId: node.departmentId,
    ownerId: node.createdById,
    requiredPermissionLevel: null,
    complianceTags: node.complianceTags,
    visibility: resolveVisibility(node.metadata),
    status: node.status,
    attributes: { type: node.type },
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
