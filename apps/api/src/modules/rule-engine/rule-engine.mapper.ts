import type { Metadata } from '@contextgraph/types'
import type { RuleCandidateNode } from './domain/candidate-node'
import {
  ResourceVisibility,
  type ResourceAuthorizationContext,
} from '../authorization/domain/resource-context'

/** Metadata key a node may carry to override the default INTERNAL visibility. */
const VISIBILITY_METADATA_KEY = 'visibility'

/**
 * Maps a candidate node into the authorization engine's resource shape so the
 * permission rule re-verifies READ with the exact same policies as node
 * reads. Visibility comes from node metadata (validated) and defaults to
 * INTERNAL — mirroring the knowledge and graph module mappers.
 */
export function candidateNodeToResourceContext(
  node: RuleCandidateNode,
): ResourceAuthorizationContext {
  return {
    id: node.id,
    resourceType: 'knowledge-node',
    organizationId: node.organizationId,
    workspaceId: node.workspaceId,
    departmentId: node.departmentId,
    ownerId: node.ownerId,
    requiredPermissionLevel: null,
    complianceTags: [...node.complianceTags],
    visibility: resolveVisibility(node.metadata),
    status: node.status,
    attributes: {
      type: node.type,
      importance: node.importance,
      inclusionReason: node.inclusionReason,
    },
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
