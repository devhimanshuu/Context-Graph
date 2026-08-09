import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphBuilder } from '../engine/graph-builder'
import { GraphValidator } from '../engine/graph-validator'
import { CycleDetector } from '../engine/cycle-detector'
import { BfsTraversalEngine } from '../engine/bfs-traversal.engine'
import { WeightedTraversalEngine } from '../engine/weighted-traversal.engine'
import { IGraphRepository, type NodeProjection } from '../graph.repository'
import { EntryNodeNotFoundError, GraphCycleDetectedError } from '../errors/graph-errors'
import { ReachabilityService } from './reachability.service'
import { IEntryNodeResolver } from './entry-node-resolver'
import { IGraphCache } from '../cache/graph-cache.interface'
import { TraversalStrategy } from '../domain/traversal'
import {
  cycleGraph,
  linearChain,
  makeEdgeEntity,
  ORG_ID,
  WORKSPACE_ID,
} from '../testing/graph-fixtures'

const builder = new GraphBuilder(new GraphValidator(new CycleDetector()))
const engine = new BfsTraversalEngine()
const weightedEngine = new WeightedTraversalEngine()

describe('ReachabilityService', () => {
  let repository: IGraphRepository
  let resolver: IEntryNodeResolver
  let cache: IGraphCache
  let service: ReachabilityService

  beforeEach(() => {
    const fixture = linearChain(4)
    const storedNodes = new Map<string, NodeProjection>(
      fixture.nodes.map((node) => [node.id, node]),
    )
    repository = {
      findEdgesByWorkspace: vi.fn(async () => fixture.edges),
      findEdgesBySource: vi.fn(async () => []),
      findEdgesByTarget: vi.fn(async () => []),
      findTypedEdges: vi.fn(async () => []),
      findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
        ids.map((id) => storedNodes.get(id)).filter((node) => node !== undefined),
      ),
    } as unknown as IGraphRepository
    resolver = {
      resolve: vi.fn(async ({ entryNodeId }) => entryNodeId),
    } as unknown as IEntryNodeResolver
    cache = {
      getTraversal: vi.fn(async () => undefined),
      setTraversal: vi.fn(async () => undefined),
      invalidateWorkspace: vi.fn(async () => undefined),
    } as unknown as IGraphCache
    service = new ReachabilityService(repository, resolver, cache, builder, engine, weightedEngine)
  })

  it('computes reachable nodes from the entry node', async () => {
    const result = await service.compute(ORG_ID, WORKSPACE_ID, {
      entryNodeId: 'n0',
      maxDepth: 10,
    })
    expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2', 'n3'])
    expect(result.distances.get('n3')).toBe(3)
    expect(repository.findEdgesByWorkspace).toHaveBeenCalledOnce()
    expect(cache.setTraversal).toHaveBeenCalledOnce()
  })

  it('serves a cached result without touching the repository', async () => {
    const cachedResult = {
      entryNodeId: 'n0',
      nodes: [],
      order: new Map(),
      distances: new Map(),
      truncated: false,
      metadata: {
        visitedNodeCount: 0,
        traversalDepth: 0,
        edgesExamined: 0,
        duplicateVisitsPrevented: 0,
        maxQueueSize: 0,
        traversalDurationMs: 0,
      },
    }
    vi.mocked(cache.getTraversal).mockResolvedValueOnce(cachedResult)
    const result = await service.compute(ORG_ID, WORKSPACE_ID, {
      entryNodeId: 'n0',
      maxDepth: 10,
    })
    expect(result).toBe(cachedResult)
    expect(repository.findEdgesByWorkspace).not.toHaveBeenCalled()
  })

  it('propagates entry-node resolution failures', async () => {
    vi.mocked(resolver.resolve).mockRejectedValueOnce(new EntryNodeNotFoundError('ghost'))
    await expect(
      service.compute(ORG_ID, WORKSPACE_ID, { entryNodeId: 'ghost', maxDepth: 10 }),
    ).rejects.toBeInstanceOf(EntryNodeNotFoundError)
  })

  it('isolates cache keys per workspace and query', async () => {
    await service.compute(ORG_ID, WORKSPACE_ID, { entryNodeId: 'n0', maxDepth: 2 })
    const setCalls = vi.mocked(cache.setTraversal).mock.calls
    expect(setCalls).toHaveLength(1)
    const [orgId, workspaceId, cacheKey] = setCalls[0] ?? []
    expect(orgId).toBe(ORG_ID)
    expect(workspaceId).toBe(WORKSPACE_ID)
    expect(cacheKey).toContain('entry:n0')
    expect(cacheKey).toContain('depth:2')
  })

  it('builds a graph that includes edges only within the tenant query', async () => {
    const fixture = linearChain(3)
    vi.mocked(repository.findEdgesByWorkspace).mockResolvedValueOnce([
      ...fixture.edges,
      makeEdgeEntity('x1', 'foreign-source', 'n0'),
    ])
    const result = await service.compute(ORG_ID, WORKSPACE_ID, {
      entryNodeId: 'n0',
      maxDepth: 10,
    })
    // The foreign edge references a node that never resolves, so it is
    // dropped from the adjacency; the traversal still completes.
    expect(result.metadata.visitedNodeCount).toBe(3)
  })

  describe('computeValidated (debug path)', () => {
    it('traverses with validation enabled and never consults the cache', async () => {
      const result = await service.computeValidated(ORG_ID, WORKSPACE_ID, {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(result.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2', 'n3'])
      expect(result.metadata.visitedNodeCount).toBe(4)
      expect(cache.getTraversal).not.toHaveBeenCalled()
      expect(cache.setTraversal).not.toHaveBeenCalled()
    })

    it('throws GraphCycleDetectedError when the workspace graph is cyclic', async () => {
      const fixture = cycleGraph()
      const storedNodes = new Map(fixture.nodes.map((node) => [node.id, node]))
      vi.mocked(repository.findEdgesByWorkspace).mockResolvedValueOnce(fixture.edges)
      vi.mocked(repository.findNodesByIds).mockResolvedValueOnce(
        ['a', 'b', 'c'].map((id) => storedNodes.get(id)).filter((node) => node !== undefined),
      )
      await expect(
        service.computeValidated(ORG_ID, WORKSPACE_ID, { entryNodeId: 'a', maxDepth: 10 }),
      ).rejects.toBeInstanceOf(GraphCycleDetectedError)
      expect(cache.setTraversal).not.toHaveBeenCalled()
    })
  })

  describe('strategy selection', () => {
    it('runs the weighted engine and returns costs when requested', async () => {
      const result = await service.compute(
        ORG_ID,
        WORKSPACE_ID,
        { entryNodeId: 'n0', maxDepth: 10 },
        { strategy: TraversalStrategy.WEIGHTED },
      )
      expect(result.costs).toBeInstanceOf(Map)
      expect(result.costs?.get('n0')).toBe(0)
      expect(result.costs?.get('n3')).toBeCloseTo(3)
      expect(result.metadata.visitedNodeCount).toBe(4)
    })

    it('isolates cache entries per strategy', async () => {
      await service.compute(ORG_ID, WORKSPACE_ID, { entryNodeId: 'n0', maxDepth: 2 })
      await service.compute(
        ORG_ID,
        WORKSPACE_ID,
        { entryNodeId: 'n0', maxDepth: 2 },
        { strategy: TraversalStrategy.WEIGHTED },
      )
      const keys = vi.mocked(cache.setTraversal).mock.calls.map((call) => call[2])
      expect(keys).toHaveLength(2)
      expect(keys[0]).toContain('strategy:bfs')
      expect(keys[1]).toContain('strategy:weighted')
    })
  })
})
