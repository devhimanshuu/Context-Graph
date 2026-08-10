import { Inject, Injectable } from '@nestjs/common'
import { PermissionAction, type AuthenticatedUser, type EntityId } from '@contextgraph/types'
import { uuid } from '../../common/utils/uuid'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
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
import {
  graphEdgeEntityToDomain,
  nodeProjectionToDomain,
  nodeProjectionToResourceContext,
} from './graph.mapper'
import { IGraphCache } from './cache/graph-cache.interface'
import { IAuthorizationService } from '../authorization/services/authorization.service'
import { IAuthorizationEvaluator } from '../authorization/evaluator/permission-evaluator'

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
  /** Reachability filtered to nodes the caller may read (server-side). */
  abstract reachableNodes(
    user: AuthenticatedUser,
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
    @Inject(IAuthorizationService) private readonly authorization: IAuthorizationService,
    @Inject(IAuthorizationEvaluator) private readonly evaluator: IAuthorizationEvaluator,
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
    user: AuthenticatedUser,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<ReachabilityResponseDto> {
    const result = await this.reachability.compute(user.organizationId, workspaceId, query, {
      strategy: query.strategy,
    })
    return this.toAuthorizedReachabilityDto(user, result)
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

  /**
   * Composes the traversal result with the authorization engine: the caller's
   * context is compiled ONCE (cached) and reused for every visited node, so
   * permission filtering costs zero additional database queries. An entry node
   * the caller may not read is treated as not found (no structure leak); the
   * DTO then contains only nodes the caller may read.
   */
  private async toAuthorizedReachabilityDto(
    user: AuthenticatedUser,
    result: GraphTraversalResult,
  ): Promise<ReachabilityResponseDto> {
    const nodeIds = result.nodes.map((node) => node.id)
    const projections = await this.getNodeProjections(user.organizationId, nodeIds)
    const byId = new Map(projections.map((projection) => [projection.id, projection]))

    const context = await this.authorization.getContext(user)
    const isReadable = (id: GraphNodeId): boolean => {
      const projection = byId.get(id)
      if (projection === undefined) return false
      return this.evaluator.evaluate(
        context,
        nodeProjectionToResourceContext(projection, user.organizationId),
        PermissionAction.READ,
      ).allowed
    }

    if (!isReadable(result.entryNodeId)) {
      throw new NotFoundException('Entry node not found or not accessible')
    }

    const authorizedIds = nodeIds.filter(isReadable)
    const authorizedSet = new Set(authorizedIds)

    return {
      entryNodeId: result.entryNodeId,
      nodeIds: authorizedIds,
      distances: pickMap(result.distances, authorizedSet),
      costs: result.costs === undefined ? undefined : pickMap(result.costs, authorizedSet),
      order: pickMap(result.order, authorizedSet),
      nodes: authorizedIds.map((id) => {
        const projection = byId.get(id)
        return {
          id,
          title: projection?.title ?? '',
          type: projection?.type ?? '',
          status: projection?.status ?? '',
        }
      }),
      traversal: result.nodes
        .filter((node) => authorizedSet.has(node.id))
        .map((node) => ({
          id: node.id,
          distance: node.distance,
          order: node.order,
          parentIds: [...node.parentIds],
        })),
      filteredNodeCount: nodeIds.length - authorizedIds.length,
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

/** Picks the entries whose keys are in the given set (O(n) over the map). */
function pickMap<K extends string, V>(
  map: ReadonlyMap<K, V>,
  keep: ReadonlySet<K>,
): Record<string, V> {
  const picked: Record<string, V> = {}
  for (const [key, value] of map) {
    if (keep.has(key)) picked[key] = value
  }
  return picked
}
