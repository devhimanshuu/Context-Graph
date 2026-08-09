import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { uuid } from '../../common/utils/uuid'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { AppException } from '../../common/exceptions/app.exception'
import { IGraphRepository, type NodeProjection } from './graph.repository'
import { type GraphEdgeResponseDto, type ReachabilityResponseDto } from './graph.dto'
import type { CreateEdgeInput, ReachabilityQueryInput } from './graph.validation'
import { ReachabilityService } from './services/reachability.service'
import type { GraphTraversalResult } from './domain/traversal'
import type { GraphNodeId } from './domain/graph-node'
import { GraphValidationIssueType, type GraphValidationError } from './domain/validation'
import {
  GraphCycleDetectedError,
  GraphNodeNotFoundError,
  InvalidGraphError,
  SelfReferenceError,
} from './errors/graph-errors'
import { GraphValidator } from './engine/graph-validator'
import { graphEdgeEntityToDomain, nodeProjectionToDomain } from './graph.mapper'
import { IGraphCache } from './cache/graph-cache.interface'

export abstract class IGraphService {
  /** Every operation is org-scoped — tenant isolation is enforced at the service boundary. */
  abstract getWorkspaceEdges(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<GraphEdgeResponseDto[]>
  abstract createEdge(
    organizationId: EntityId,
    workspaceId: EntityId,
    input: CreateEdgeInput,
    createdById: EntityId | null,
  ): Promise<GraphEdgeResponseDto>
  abstract reachableNodes(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<ReachabilityResponseDto>
  abstract getNodeProjections(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]>
}

/**
 * Graph application service. Owns the API-facing contract; delegates graph
 * computation to the ReachabilityService + BFS engine so business modules
 * (permission, rules, candidate) can reuse the same engine independently.
 *
 * The write path (`createEdge`) enforces the DAG invariant BEFORE persisting:
 * the candidate edge is validated against the current workspace graph and a
 * cyclic insert is rejected with GraphCycleDetectedError.
 */
@Injectable()
export class GraphService implements IGraphService {
  constructor(
    @Inject(IGraphRepository) private readonly repository: IGraphRepository,
    private readonly reachability: ReachabilityService,
    private readonly validator: GraphValidator,
    @Inject(IGraphCache) private readonly cache: IGraphCache,
  ) {}

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

  async createEdge(
    organizationId: EntityId,
    workspaceId: EntityId,
    input: CreateEdgeInput,
    createdById: EntityId | null,
  ): Promise<GraphEdgeResponseDto> {
    // Load the current workspace graph in two batched queries (no N+1).
    const existingEdges = await this.repository.findEdgesByWorkspace(organizationId, workspaceId)
    const nodeIds = new Set<GraphNodeId>([input.sourceId, input.targetId])
    for (const edge of existingEdges) {
      nodeIds.add(edge.sourceId)
      nodeIds.add(edge.targetId)
    }
    const nodes = await this.repository.findNodesByIds(organizationId, [...nodeIds])

    // The candidate edge is validated together with the existing graph BEFORE
    // any write — a cyclic insert never reaches the database.
    const candidateId = uuid()
    const validation = this.validator.validate(nodes.map(nodeProjectionToDomain), [
      ...existingEdges.map(graphEdgeEntityToDomain),
      {
        id: candidateId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        relationshipType: input.relationshipType,
        weight: input.weight,
      },
    ])
    if (!validation.valid) {
      throw this.toCreationError(validation.errors, input)
    }

    const entity = await this.repository.createEdge(
      organizationId,
      workspaceId,
      input,
      candidateId,
      createdById,
    )

    // The graph changed — cached traversals of this workspace are now stale.
    await this.cache.invalidateWorkspace(organizationId, workspaceId)

    return {
      id: entity.id,
      sourceId: entity.sourceId,
      targetId: entity.targetId,
      relationshipType: entity.relationshipType,
      weight: entity.weight,
    }
  }

  async reachableNodes(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<ReachabilityResponseDto> {
    const result = await this.reachability.compute(organizationId, workspaceId, query, {
      strategy: query.strategy,
    })
    return this.toReachabilityDto(organizationId, result)
  }

  async getNodeProjections(organizationId: EntityId, ids: EntityId[]): Promise<NodeProjection[]> {
    if (ids.length === 0) return []
    return this.repository.findNodesByIds(organizationId, ids)
  }

  /** Maps validation issues to the most precise domain error for the insert. */
  private toCreationError(
    errors: readonly GraphValidationError[],
    input: CreateEdgeInput,
  ): AppException {
    const find = (type: GraphValidationIssueType) => errors.find((error) => error.type === type)

    const selfReference = find(GraphValidationIssueType.SELF_REFERENCE)
    if (selfReference !== undefined) {
      return new SelfReferenceError(
        `candidate:${input.sourceId}:${input.targetId}`,
        selfReference.nodeId ?? input.sourceId,
      )
    }

    const duplicate = find(GraphValidationIssueType.DUPLICATE_EDGE)
    if (duplicate !== undefined) {
      return new ConflictException(
        `Edge already exists: ${input.sourceId} -> ${input.targetId} (${input.relationshipType})`,
        {
          sourceId: input.sourceId,
          targetId: input.targetId,
          relationshipType: input.relationshipType,
        },
      )
    }

    const cycle = find(GraphValidationIssueType.CYCLE)
    if (cycle !== undefined) {
      return new GraphCycleDetectedError(cycle.cycle ?? [])
    }

    const missing = find(GraphValidationIssueType.MISSING_NODE)
    if (missing !== undefined) {
      return new GraphNodeNotFoundError(missing.nodeId ?? input.sourceId)
    }

    return new InvalidGraphError(errors)
  }

  private async toReachabilityDto(
    organizationId: EntityId,
    result: GraphTraversalResult,
  ): Promise<ReachabilityResponseDto> {
    const nodeIds = result.nodes.map((node) => node.id)
    const projections = await this.getNodeProjections(organizationId, nodeIds)
    const byId = new Map(projections.map((projection) => [projection.id, projection]))

    return {
      entryNodeId: result.entryNodeId,
      nodeIds,
      distances: Object.fromEntries(result.distances),
      costs: result.costs === undefined ? undefined : Object.fromEntries(result.costs),
      order: Object.fromEntries(result.order),
      nodes: nodeIds.map((id) => {
        const projection = byId.get(id)
        return {
          id,
          title: projection?.title ?? '',
          type: projection?.type ?? '',
          status: projection?.status ?? '',
        }
      }),
      traversal: result.nodes.map((node) => ({
        id: node.id,
        distance: node.distance,
        order: node.order,
        parentIds: [...node.parentIds],
      })),
      metadata: {
        visitedNodeCount: result.metadata.visitedNodeCount,
        traversalDepth: result.metadata.traversalDepth,
        edgesExamined: result.metadata.edgesExamined,
        duplicateVisitsPrevented: result.metadata.duplicateVisitsPrevented,
        maxQueueSize: result.metadata.maxQueueSize,
        traversalDurationMs: result.metadata.traversalDurationMs,
        truncated: result.truncated,
      },
    }
  }
}
