import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type { GraphTraversalResult } from '../domain/traversal'
import { TraversalStrategy } from '../domain/traversal'
import type { ReachabilityQueryInput } from '../graph.validation'
import { IGraphRepository } from '../graph.repository'
import { IGraphCache } from '../cache/graph-cache.interface'
import { IEntryNodeResolver } from './entry-node-resolver'
import { GraphBuilder } from '../engine/graph-builder'
import { IGraphTraversalEngine } from '../engine/traversal-engine.interface'
import { WeightedTraversalEngine } from '../engine/weighted-traversal.engine'
import { GraphTraversalError } from '../errors/graph-errors'
import { AppException } from '../../../common/exceptions/app.exception'

/**
 * DAG integrity is enforced at write time and via GraphValidator. Validating
 * the full graph on every read would double the traversal cost for large
 * workspaces, and BFS is already cycle-safe (the visited set bounds the walk).
 */
const VALIDATE_GRAPH_ON_READ = false

/**
 * Orchestrates a reachability computation: resolve the entry node, load the
 * workspace graph in two batched queries, build the domain graph, run the
 * selected traversal strategy, and cache the result. The service composes the
 * engines — it never implements traversal itself.
 *
 * Strategy selection is part of the cache key: a BFS result and a weighted
 * result for the same query are different answers and are never confused.
 */
@Injectable()
export class ReachabilityService {
  constructor(
    @Inject(IGraphRepository) private readonly repository: IGraphRepository,
    @Inject(IEntryNodeResolver) private readonly entryNodeResolver: IEntryNodeResolver,
    @Inject(IGraphCache) private readonly cache: IGraphCache,
    private readonly builder: GraphBuilder,
    @Inject(IGraphTraversalEngine) private readonly defaultEngine: IGraphTraversalEngine,
    private readonly weightedEngine: WeightedTraversalEngine,
  ) {}

  async compute(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
    options: { strategy?: TraversalStrategy } = {},
  ): Promise<GraphTraversalResult> {
    const entryNodeId = await this.resolveEntry(organizationId, workspaceId, query)
    const strategy = options.strategy ?? TraversalStrategy.BFS
    const engine =
      strategy === TraversalStrategy.WEIGHTED ? this.weightedEngine : this.defaultEngine

    const cacheKey = this.cacheKey(entryNodeId, query, strategy)
    const cached = await this.cache.getTraversal(organizationId, workspaceId, cacheKey)
    if (cached !== undefined) return cached

    const result = await this.traverse(organizationId, workspaceId, entryNodeId, query, engine, {
      validate: VALIDATE_GRAPH_ON_READ,
    })
    await this.cache.setTraversal(organizationId, workspaceId, cacheKey, result)
    return result
  }

  /**
   * Debug path: same pipeline with the default (BFS) engine, but the full
   * graph is validated first (cycles/broken edges throw) and no cache is
   * consulted, so every call reflects the current database state.
   */
  async computeValidated(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<GraphTraversalResult> {
    const entryNodeId = await this.resolveEntry(organizationId, workspaceId, query)
    return this.traverse(organizationId, workspaceId, entryNodeId, query, this.defaultEngine, {
      validate: true,
    })
  }

  private async resolveEntry(
    organizationId: EntityId,
    workspaceId: EntityId,
    query: ReachabilityQueryInput,
  ): Promise<EntityId> {
    this.defaultEngine.assertSupportedDepth(query.maxDepth)
    return this.entryNodeResolver.resolve({
      organizationId,
      workspaceId,
      entryNodeId: query.entryNodeId,
    })
  }

  private async traverse(
    organizationId: EntityId,
    workspaceId: EntityId,
    entryNodeId: EntityId,
    query: ReachabilityQueryInput,
    engine: IGraphTraversalEngine,
    options: { validate: boolean },
  ): Promise<GraphTraversalResult> {
    const graph = await this.loadGraph(organizationId, workspaceId, entryNodeId, options.validate)
    try {
      return engine.traverse(graph, {
        entryNodeId,
        maxDepth: query.maxDepth,
        relationshipTypes: query.relationshipTypes,
      })
    } catch (error) {
      // Domain errors (validation, entry resolution) already carry context.
      if (error instanceof AppException) throw error
      throw new GraphTraversalError('Reachability computation failed', {
        cause: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /** Two batched queries per workspace: all edges, then node projections. */
  private async loadGraph(
    organizationId: EntityId,
    workspaceId: EntityId,
    entryNodeId: EntityId,
    validate: boolean,
  ) {
    const edges = await this.repository.findEdgesByWorkspace(organizationId, workspaceId)
    const nodeIds = new Set<string>([entryNodeId])
    for (const edge of edges) {
      nodeIds.add(edge.sourceId)
      nodeIds.add(edge.targetId)
    }
    const nodes = await this.repository.findNodesByIds(organizationId, [...nodeIds])
    return this.builder.build(nodes, edges, { validate })
  }

  private cacheKey(
    entryNodeId: EntityId,
    query: ReachabilityQueryInput,
    strategy: TraversalStrategy,
  ): string {
    const types = query.relationshipTypes === undefined ? [] : [...query.relationshipTypes].sort()
    return `entry:${entryNodeId}:depth:${query.maxDepth}:types:${types.join(',') || 'all'}:strategy:${strategy}`
  }
}
