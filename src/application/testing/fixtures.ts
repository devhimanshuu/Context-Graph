import {
  buildCandidateNode,
  buildGraphEdge,
  buildKnowledgeNode,
  buildNodeContext,
  buildOrganization,
  buildPermissionContext,
  buildTraversalContext,
  buildUser,
  buildUserContext,
  buildWorkspace,
} from './builders'

/**
 * Canned fixtures — shared, immutable test data. Prefer builders when a test
 * needs a specific shape; use these for the common happy-path cases.
 */

export const organizationFixture = buildOrganization()

export const workspaceFixture = buildWorkspace()

export const userFixture = buildUser()

export const editorUserContextFixture = buildUserContext()

export const adminUserContextFixture = buildUserContext({ role: 'ADMIN', permissionLevel: 'ADMIN' })

export const viewerUserContextFixture = buildUserContext({
  role: 'VIEWER',
  permissionLevel: 'READ',
})

export const knowledgeNodeFixture = buildKnowledgeNode()

export const highImportanceFactNodeFixture = buildKnowledgeNode({
  title: 'High-importance fact',
  type: 'FACT',
  importance: 90,
})

export const constraintNodeFixture = buildKnowledgeNode({
  title: 'Constraint node',
  type: 'CONSTRAINT',
})

export const graphEdgeFixture = buildGraphEdge()

export const nodeContextFixture = buildNodeContext()

export const candidateNodeFixture = buildCandidateNode()

export const permissionContextFixture = buildPermissionContext()

export const traversalContextFixture = buildTraversalContext({
  visitedNodeIds: ['node-a', 'node-b'],
  edgesTraversed: [{ sourceId: 'node-a', targetId: 'node-b', relationshipType: 'SUPPORTS' }],
  depth: 1,
})
