import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IGraphRepository, type NodeProjection } from './graph.repository'
import { type GraphEdgeResponseDto, type ReachabilityResponseDto } from './graph.dto'
import type { ReachabilityQueryInput } from './graph.validation'

export abstract class IGraphService {
  /** Every operation is org-scoped — tenant isolation is enforced at the service boundary. */
  abstract getWorkspaceEdges(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<GraphEdgeResponseDto[]>
  abstract reachableNodes(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<ReachabilityResponseDto>
  abstract getNodeProjections(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]>
}

/* Graph application service. Scaffold: `reachableNodes` resolves the graph from the repository and will */
@Injectable()
export class GraphService implements IGraphService {
  constructor(@Inject(IGraphRepository) private readonly repository: IGraphRepository) {}

  async getWorkspaceEdges(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<GraphEdgeResponseDto[]> {
    const edges = await this.repository.findEdgesByWorkspace(organizationId, workspaceId)
    return edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationshipType: edge.relationshipType,
      weight: edge.weight,
    }))
  }

  async reachableNodes(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<ReachabilityResponseDto> {
    const outgoing = await this.repository.findEdgesBySource(
      organizationId,
      workspaceId,
      query.entryNodeId,
    )

    // BFS wiring lands with the traversal engine (Phase 6). For now expose the
    // immediate neighborhood so consumers can build against a stable contract.
    const nodeIds = outgoing.map((edge) => edge.targetId)
    const distances = new Map<string, number>([[query.entryNodeId, 0]])
    for (const edge of outgoing) {
      distances.set(edge.targetId, 1)
    }

    return {
      nodeIds,
      distances: Object.fromEntries(distances),
      nodes: await this.getNodeProjections(organizationId, nodeIds),
    }
  }

  async getNodeProjections(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]> {
    if (ids.length === 0) return []
    return this.repository.findNodesByIds(organizationId, ids)
  }
}
