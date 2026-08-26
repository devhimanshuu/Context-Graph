/* WriteBack Graph Validator — validates proposed graph mutations.

Uses the existing GraphValidator to ensure proposed relationships don't create
cycles, reference missing nodes, or create duplicate edges. Does NOT reimplement
cycle detection. */

import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IGraphRepository } from '../../graph/graph.repository'
import { GraphValidator } from '../../graph/engine/graph-validator'
import type { GraphNode } from '../../graph/domain/graph-node'
import type { GraphEdge } from '../../graph/domain/graph-edge'
import { IWriteBackGraphValidator } from '../domain/writeback.interfaces'

@Injectable()
export class WriteBackGraphValidator implements IWriteBackGraphValidator {
  constructor(
    @Inject(IGraphRepository) private readonly graphRepo: IGraphRepository,
    private readonly graphValidator: GraphValidator,
  ) {}

  async validateRelationships(
    organizationId: EntityId,
    workspaceId: EntityId,
    parentNodeIds: readonly EntityId[],
    newRelationships: readonly { targetNodeId: EntityId; relationshipType: string }[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    if (newRelationships.length === 0) {
      return { valid: true, errors: [] }
    }

    // Collect all node IDs we need to check
    const allNodeIds = new Set<EntityId>()
    for (const id of parentNodeIds) allNodeIds.add(id)
    for (const rel of newRelationships) {
      allNodeIds.add(rel.targetNodeId)
    }

    // Verify all referenced nodes exist and are in the same org
    const nodeProjections = await this.graphRepo.findNodesByIds(organizationId, [...allNodeIds])
    const existingNodeIds = new Set(nodeProjections.map((n) => n.id))

    const errors: string[] = []

    // Check all nodes exist
    for (const id of allNodeIds) {
      if (!existingNodeIds.has(id)) {
        errors.push(`Node ${id} does not exist or is not in this organization`)
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // Build domain graph nodes for the validator
    const graphNodes: GraphNode[] = nodeProjections.map((projection) => ({
      id: projection.id,
      title: projection.title,
      type: projection.type,
      status: projection.status,
    }))

    // Get existing edges for the workspace
    const existingEdges = await this.graphRepo.findEdgesByWorkspace(organizationId, workspaceId)
    const graphEdges: GraphEdge[] = existingEdges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationshipType: edge.relationshipType,
      weight: edge.weight,
    }))

    // Add candidate edges (new node will connect via parent relationships)
    // We use placeholder IDs for the new node since it hasn't been created yet
    for (const rel of newRelationships) {
      for (const parentNodeId of parentNodeIds) {
        graphEdges.push({
          id: `candidate:${parentNodeId}:${rel.targetNodeId}`,
          sourceId: parentNodeId,
          targetId: rel.targetNodeId,
          relationshipType: rel.relationshipType as
            'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS',
          weight: 1,
        })
      }
    }

    // Run the existing graph validator
    const result = this.graphValidator.validate(graphNodes, graphEdges)

    if (!result.valid) {
      for (const error of result.errors) {
        errors.push(error.message)
      }
    }

    return { valid: result.valid, errors }
  }
}
