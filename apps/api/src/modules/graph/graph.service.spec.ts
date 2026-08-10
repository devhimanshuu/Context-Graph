import { describe, expect, it, vi } from 'vitest'
import {
  ComplianceClearance,
  ComplianceTag,
  NodeStatus,
  NodeType,
  PermissionLevel,
  RelationshipType,
  Role,
  type AuthenticatedUser,
} from '@contextgraph/types'
import type { IGraphRepository } from './graph.repository'
import type { ReachabilityService } from './services/reachability.service'
import { GraphService } from './graph.service'
import { GraphEdgeEntity } from './graph-edge.entity'
import { GraphValidator } from './engine/graph-validator'
import { CycleDetector } from './engine/cycle-detector'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import {
  GraphCycleDetectedError,
  GraphNodeNotFoundError,
  SelfReferenceError,
} from './errors/graph-errors'
import { ORG_ID, WORKSPACE_ID, makeEdgeEntity, makeNodeProjection } from './testing/graph-fixtures'
import { IAuthorizationService } from '../authorization/services/authorization.service'
import { PermissionEvaluator } from '../authorization/evaluator/permission-evaluator'
import { PolicyPipeline } from '../authorization/policies/policy-pipeline'
import { OrganizationPolicy } from '../authorization/policies/organization.policy'
import { DepartmentPolicy } from '../authorization/policies/department.policy'
import { RolePolicy } from '../authorization/policies/role.policy'
import { PermissionLevelPolicy } from '../authorization/policies/permission-level.policy'
import { CompliancePolicy } from '../authorization/policies/compliance.policy'
import { VisibilityPolicy } from '../authorization/policies/visibility.policy'
import { DEPT_FINANCE, makeContext } from '../authorization/testing/authorization-fixtures'
import type { CompiledAuthorizationContext } from '../authorization/domain/authorization-context'

const validator = new GraphValidator(new CycleDetector())

const READER: AuthenticatedUser = {
  id: 'user-1',
  organizationId: ORG_ID,
  departmentId: null,
  email: 'reader@acme.test',
  name: 'Reader',
  role: Role.EDITOR,
  permissionLevel: PermissionLevel.WRITE,
  complianceClearance: ComplianceClearance.SENSITIVE,
}

function makeEvaluator(): PermissionEvaluator {
  return new PermissionEvaluator(
    new PolicyPipeline(
      new OrganizationPolicy(),
      new DepartmentPolicy(),
      new RolePolicy(),
      new PermissionLevelPolicy(),
      new CompliancePolicy(),
      new VisibilityPolicy(),
    ),
  )
}

function makeAuth(overrides: Partial<CompiledAuthorizationContext> = {}): IAuthorizationService {
  return {
    getContext: vi.fn(async () => makeContext({ organizationId: ORG_ID, ...overrides })),
  } as unknown as IAuthorizationService
}

function makeEdge(): GraphEdgeEntity {
  return makeEdgeEntity('edge-1', 'src-1', 'tgt-1', RelationshipType.SUPPORTS, 1)
}

function makeCache() {
  return { invalidateWorkspace: vi.fn(async () => undefined) }
}

describe('GraphService', () => {
  it('lists workspace edges mapped to the response shape', async () => {
    const repository = {
      findEdgesByWorkspace: vi.fn(async () => [makeEdge()]),
    } as unknown as IGraphRepository
    const service = new GraphService(
      repository,
      {} as ReachabilityService,
      validator,
      makeCache(),
      makeAuth(),
      makeEvaluator(),
    )

    const edges = await service.getWorkspaceEdges(ORG_ID, WORKSPACE_ID)
    expect(edges).toEqual([
      {
        id: 'edge-1',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        relationshipType: RelationshipType.SUPPORTS,
        weight: 1,
      },
    ])
  })

  it('maps a traversal result into the reachability DTO', async () => {
    const repository = {
      findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
        ids.map((id) => makeNodeProjection(id, `Title ${id}`)),
      ),
    } as unknown as IGraphRepository
    const reachability = {
      compute: vi.fn(async () => ({
        entryNodeId: 'n0',
        nodes: [
          { id: 'n0', distance: 0, order: 0, parentIds: [] },
          { id: 'n1', distance: 1, order: 1, parentIds: ['n2'] },
        ],
        order: new Map([
          ['n0', 0],
          ['n1', 1],
        ]),
        distances: new Map([
          ['n0', 0],
          ['n1', 1],
        ]),
        truncated: false,
        metadata: {
          visitedNodeCount: 2,
          traversalDepth: 1,
          edgesExamined: 1,
          duplicateVisitsPrevented: 0,
          maxQueueSize: 1,
          traversalDurationMs: 0.25,
        },
      })),
    } as unknown as ReachabilityService
    const service = new GraphService(
      repository,
      reachability,
      validator,
      makeCache(),
      makeAuth(),
      makeEvaluator(),
    )

    const dto = await service.reachableNodes(READER, WORKSPACE_ID, {
      entryNodeId: 'n0',
      maxDepth: 10,
    })
    expect(dto.entryNodeId).toBe('n0')
    expect(dto.nodeIds).toEqual(['n0', 'n1'])
    expect(dto.distances).toEqual({ n0: 0, n1: 1 })
    expect(dto.order).toEqual({ n0: 0, n1: 1 })
    expect(dto.filteredNodeCount).toBe(0)
    expect(dto.traversal?.[1]).toEqual({ id: 'n1', distance: 1, order: 1, parentIds: ['n2'] })
    expect(dto.metadata?.visitedNodeCount).toBe(2)
    expect(dto.nodes?.[1]).toEqual({
      id: 'n1',
      title: 'Title n1',
      type: NodeType.FACT,
      status: NodeStatus.ACTIVE,
    })
  })

  it('maps weighted traversal costs into the reachability DTO', async () => {
    const reachability = {
      compute: vi.fn(async () => ({
        entryNodeId: 'n0',
        nodes: [
          { id: 'n0', distance: 0, order: 0, parentIds: [] },
          { id: 'n1', distance: 1, order: 1, parentIds: [] },
        ],
        order: new Map([
          ['n0', 0],
          ['n1', 1],
        ]),
        distances: new Map([
          ['n0', 0],
          ['n1', 1],
        ]),
        costs: new Map([
          ['n0', 0],
          ['n1', 0.4],
        ]),
        truncated: false,
        metadata: {
          visitedNodeCount: 2,
          traversalDepth: 1,
          edgesExamined: 1,
          duplicateVisitsPrevented: 0,
          maxQueueSize: 1,
          traversalDurationMs: 0.25,
        },
      })),
    } as unknown as ReachabilityService
    const service = new GraphService(
      {
        findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
          ids.map((id) => makeNodeProjection(id)),
        ),
      } as unknown as IGraphRepository,
      reachability,
      validator,
      makeCache(),
      makeAuth(),
      makeEvaluator(),
    )

    const dto = await service.reachableNodes(READER, WORKSPACE_ID, {
      entryNodeId: 'n0',
      maxDepth: 10,
      strategy: 'weighted',
    })
    expect(dto.costs).toEqual({ n0: 0, n1: 0.4 })
    // Strategy is forwarded to the engine layer.
    expect(reachability.compute).toHaveBeenCalledWith(
      ORG_ID,
      WORKSPACE_ID,
      { entryNodeId: 'n0', maxDepth: 10, strategy: 'weighted' },
      { strategy: 'weighted' },
    )
  })

  describe('reachability permission filtering', () => {
    function makeReachability(entryNodeId: string) {
      return {
        compute: vi.fn(async () => ({
          entryNodeId,
          nodes: ['n0', 'n1', 'n2'].map((id, order) => ({
            id,
            distance: order,
            order,
            parentIds: [],
          })),
          order: new Map([
            ['n0', 0],
            ['n1', 1],
            ['n2', 2],
          ]),
          distances: new Map([
            ['n0', 0],
            ['n1', 1],
            ['n2', 2],
          ]),
          truncated: false,
          metadata: {
            visitedNodeCount: 3,
            traversalDepth: 2,
            edgesExamined: 2,
            duplicateVisitsPrevented: 0,
            maxQueueSize: 1,
            traversalDurationMs: 0.1,
          },
        })),
      } as unknown as ReachabilityService
    }

    it('filters out nodes the caller may not read, keeping one compiled context', async () => {
      const repository = {
        findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
          ids.map((id) => {
            if (id === 'n1')
              return makeNodeProjection(id, `Node ${id}`, {
                complianceTags: [ComplianceTag.RESTRICTED],
              })
            if (id === 'n2')
              return makeNodeProjection(id, `Node ${id}`, { departmentId: DEPT_FINANCE })
            return makeNodeProjection(id, `Node ${id}`)
          }),
        ),
      } as unknown as IGraphRepository
      const authorization = makeAuth()
      const service = new GraphService(
        repository,
        makeReachability('n0'),
        validator,
        makeCache(),
        authorization,
        makeEvaluator(),
      )

      const dto = await service.reachableNodes(READER, WORKSPACE_ID, {
        entryNodeId: 'n0',
        maxDepth: 10,
      })
      expect(dto.nodeIds).toEqual(['n0'])
      expect(dto.filteredNodeCount).toBe(2)
      expect(dto.distances).toEqual({ n0: 0 })
      expect(authorization.getContext).toHaveBeenCalledTimes(1)
      expect(repository.findNodesByIds).toHaveBeenCalledTimes(1)
    })

    it('treats an unreadable entry node as not found (no structure leak)', async () => {
      const repository = {
        findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
          ids.map((id) =>
            makeNodeProjection(id, `Node ${id}`, { complianceTags: [ComplianceTag.RESTRICTED] }),
          ),
        ),
      } as unknown as IGraphRepository
      const service = new GraphService(
        repository,
        makeReachability('n0'),
        validator,
        makeCache(),
        makeAuth(),
        makeEvaluator(),
      )

      await expect(
        service.reachableNodes(READER, WORKSPACE_ID, { entryNodeId: 'n0', maxDepth: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('createEdge', () => {
    const allNodes = new Map(['n0', 'n1', 'n2', 'n3'].map((id) => [id, makeNodeProjection(id)]))

    function makeService(existingEdges: GraphEdgeEntity[], knownNodeIds: string[]) {
      const repository = {
        findEdgesByWorkspace: vi.fn(async () => existingEdges),
        findNodesByIds: vi.fn(async (_orgId: string, ids: string[]) =>
          ids
            .map((id) => allNodes.get(id))
            .filter((node) => node !== undefined && knownNodeIds.includes(node.id)),
        ),
        createEdge: vi.fn(
          async (
            _orgId: string,
            _workspaceId: string,
            input: { sourceId: string; targetId: string; relationshipType: string; weight: number },
            id: string,
          ) =>
            makeEdgeEntity(
              id,
              input.sourceId,
              input.targetId,
              input.relationshipType,
              input.weight,
            ),
        ),
      } as unknown as IGraphRepository
      const cache = makeCache()
      const service = new GraphService(
        repository,
        {} as ReachabilityService,
        validator,
        cache,
        makeAuth(),
        makeEvaluator(),
      )
      return { repository, cache, service }
    }

    it('persists an acyclic insert and invalidates the workspace cache', async () => {
      const { repository, cache, service } = makeService(
        [makeEdgeEntity('e0', 'n0', 'n1')],
        ['n0', 'n1', 'n2'],
      )
      const dto = await service.createEdge(
        ORG_ID,
        WORKSPACE_ID,
        {
          sourceId: 'n1',
          targetId: 'n2',
          relationshipType: RelationshipType.SUPPORTS,
          weight: 1,
          metadata: {},
        },
        'user-1',
      )

      expect(repository.createEdge).toHaveBeenCalledOnce()
      const [orgId, workspaceId, input, id, createdById] = vi.mocked(repository.createEdge).mock
        .calls[0] as unknown as [string, string, { sourceId: string }, string, string]
      expect(orgId).toBe(ORG_ID)
      expect(workspaceId).toBe(WORKSPACE_ID)
      expect(input.sourceId).toBe('n1')
      expect(id).toMatch(/^[0-9a-f-]{36}$/)
      expect(createdById).toBe('user-1')
      expect(cache.invalidateWorkspace).toHaveBeenCalledWith(ORG_ID, WORKSPACE_ID)
      expect(dto.id).toBe(id)
      expect(dto.sourceId).toBe('n1')
      expect(dto.targetId).toBe('n2')
    })

    it('rejects a cyclic insert with GraphCycleDetectedError before persisting', async () => {
      const { repository, cache, service } = makeService(
        [makeEdgeEntity('e0', 'n0', 'n1'), makeEdgeEntity('e1', 'n1', 'n2')],
        ['n0', 'n1', 'n2'],
      )
      await expect(
        service.createEdge(
          ORG_ID,
          WORKSPACE_ID,
          {
            sourceId: 'n2',
            targetId: 'n0',
            relationshipType: RelationshipType.SUPPORTS,
            weight: 1,
            metadata: {},
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(GraphCycleDetectedError)

      expect(repository.createEdge).not.toHaveBeenCalled()
      expect(cache.invalidateWorkspace).not.toHaveBeenCalled()
    })

    it('rejects a self-referencing insert', async () => {
      const { repository, service } = makeService([], ['n0'])
      await expect(
        service.createEdge(
          ORG_ID,
          WORKSPACE_ID,
          {
            sourceId: 'n0',
            targetId: 'n0',
            relationshipType: RelationshipType.SUPPORTS,
            weight: 1,
            metadata: {},
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(SelfReferenceError)
      expect(repository.createEdge).not.toHaveBeenCalled()
    })

    it('rejects a duplicate edge with a conflict', async () => {
      const { repository, service } = makeService(
        [makeEdgeEntity('e0', 'n0', 'n1', RelationshipType.SUPPORTS)],
        ['n0', 'n1'],
      )
      await expect(
        service.createEdge(
          ORG_ID,
          WORKSPACE_ID,
          {
            sourceId: 'n0',
            targetId: 'n1',
            relationshipType: RelationshipType.SUPPORTS,
            weight: 1,
            metadata: {},
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException)
      expect(repository.createEdge).not.toHaveBeenCalled()
    })

    it('rejects an insert whose endpoint does not exist', async () => {
      const { repository, service } = makeService([], ['n0'])
      await expect(
        service.createEdge(
          ORG_ID,
          WORKSPACE_ID,
          {
            sourceId: 'n0',
            targetId: 'ghost',
            relationshipType: RelationshipType.SUPPORTS,
            weight: 1,
            metadata: {},
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(GraphNodeNotFoundError)
      expect(repository.createEdge).not.toHaveBeenCalled()
    })
  })
})
