import { describe, expect, it, vi } from 'vitest'
import {
  ComplianceClearance,
  ComplianceTag,
  NodeStatus,
  NodeType,
  PermissionAction,
  PermissionLevel,
  Role,
  type AuthenticatedUser,
  type EntityId,
} from '@contextgraph/types'
import { KnowledgeService } from './knowledge.service'
import { KnowledgeNodeEntity } from './knowledge.entity'
import { IKnowledgeRepository } from './knowledge.repository'
import { IAuthorizationService } from '../authorization/services/authorization.service'
import { PermissionEvaluator } from '../authorization/evaluator/permission-evaluator'
import { PolicyPipeline } from '../authorization/policies/policy-pipeline'
import { OrganizationPolicy } from '../authorization/policies/organization.policy'
import { DepartmentPolicy } from '../authorization/policies/department.policy'
import { RolePolicy } from '../authorization/policies/role.policy'
import { PermissionLevelPolicy } from '../authorization/policies/permission-level.policy'
import { CompliancePolicy } from '../authorization/policies/compliance.policy'
import { VisibilityPolicy } from '../authorization/policies/visibility.policy'
import { PermissionDeniedException } from '../authorization/errors/authorization-errors'
import type { ResourceAuthorizationContext } from '../authorization/domain/resource-context'
import type { IAuthorizationAuditLogger } from '../authorization/audit/authorization-audit-logger'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import {
  DEPT_ENGINEERING,
  DEPT_FINANCE,
  ORG_A,
  ORG_B,
  USER_ID,
  makeContext,
} from '../authorization/testing/authorization-fixtures'

interface NodeOverrides {
  departmentId?: EntityId | null
  complianceTags?: ComplianceTag[]
  metadata?: Record<string, unknown>
  organizationId?: EntityId
  ownerId?: EntityId | null
  type?: NodeType
}

function makeNode(id: string, overrides: NodeOverrides = {}): KnowledgeNodeEntity {
  return new KnowledgeNodeEntity(
    id,
    overrides.organizationId ?? ORG_A,
    'ws-1',
    overrides.departmentId ?? DEPT_ENGINEERING,
    `Title ${id}`,
    'Content',
    overrides.type ?? NodeType.FACT,
    NodeStatus.ACTIVE,
    50,
    0,
    1,
    null,
    null,
    overrides.complianceTags ?? [],
    overrides.metadata ?? {},
    overrides.ownerId ?? USER_ID,
    USER_ID,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    null,
  )
}

function makeService(nodes: KnowledgeNodeEntity[]) {
  const repository = {
    findByWorkspace: vi.fn(async (_orgId: EntityId, _wsId: EntityId) => nodes),
    findById: vi.fn(async (id: EntityId) => nodes.find((node) => node.id === id) ?? null),
    create: vi.fn(async () => makeNode('n-created')),
    update: vi.fn(async (id: EntityId) => makeNode(id)),
  } as unknown as IKnowledgeRepository
  const evaluator = new PermissionEvaluator(
    new PolicyPipeline(
      new OrganizationPolicy(),
      new DepartmentPolicy(),
      new RolePolicy(),
      new PermissionLevelPolicy(),
      new CompliancePolicy(),
      new VisibilityPolicy(),
    ),
  )
  const authorization = {
    getContext: vi.fn(async () => makeContext()),
    evaluateResource: vi.fn(
      async (
        _user: AuthenticatedUser,
        resource: ResourceAuthorizationContext,
        action: PermissionAction,
      ) => evaluator.evaluate(makeContext(), resource, action),
    ),
  } as unknown as IAuthorizationService
  const audit = {
    recordDenial: vi.fn(async () => undefined),
    recordEvent: vi.fn(async () => undefined),
  } as unknown as IAuthorizationAuditLogger
  const service = new KnowledgeService(repository, authorization, evaluator, audit)
  return { repository, authorization, audit, service }
}

const READER: AuthenticatedUser = {
  id: USER_ID,
  organizationId: ORG_A,
  departmentId: DEPT_ENGINEERING,
  email: 'reader@acme.test',
  name: 'Reader',
  role: Role.EDITOR,
  permissionLevel: PermissionLevel.WRITE,
  complianceClearance: ComplianceClearance.SENSITIVE,
}

function failingPolicy(error: unknown): string | null | undefined {
  if (error instanceof PermissionDeniedException) {
    const details = error.details as { failedPolicy?: string | null } | undefined
    return details?.failedPolicy
  }
  return undefined
}

describe('KnowledgeService — permission-aware reads', () => {
  it('filters the workspace list to nodes the principal may read', async () => {
    const { service } = makeService([
      makeNode('n-visible'),
      makeNode('n-other-dept', { departmentId: DEPT_FINANCE }),
      makeNode('n-restricted', { complianceTags: [ComplianceTag.RESTRICTED] }),
    ])
    const result = await service.findByWorkspace(READER, 'ws-1')
    expect(result.map((node) => node.id)).toEqual(['n-visible'])
  })

  it('audits every withheld node with actor, node id and failing policy', async () => {
    const { audit, service } = makeService([
      makeNode('n-visible'),
      makeNode('n-other-dept', { departmentId: DEPT_FINANCE }),
      makeNode('n-restricted', { complianceTags: [ComplianceTag.RESTRICTED] }),
    ])
    await service.findByWorkspace(READER, 'ws-1')
    expect(audit.recordDenial).toHaveBeenCalledTimes(2)
    expect(audit.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        actorId: USER_ID,
        resourceType: 'knowledge-node',
        resourceId: 'n-other-dept',
        failedPolicy: 'DEPARTMENT',
      }),
    )
    expect(audit.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'n-restricted',
        failedPolicy: 'COMPLIANCE',
      }),
    )
    expect(audit.recordDenial).not.toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'n-visible' }),
    )
  })

  it('does not audit when every node is authorized', async () => {
    const { audit, service } = makeService([makeNode('n-1'), makeNode('n-2')])
    await service.findByWorkspace(READER, 'ws-1')
    expect(audit.recordDenial).not.toHaveBeenCalled()
  })

  it('returns an empty list for an empty workspace', async () => {
    const { repository, service } = makeService([])
    await expect(service.findByWorkspace(READER, 'ws-1')).resolves.toEqual([])
    expect(repository.findByWorkspace).toHaveBeenCalledWith(ORG_A, 'ws-1')
  })

  it('compiles the authorization context once for the whole batch (no per-node queries)', async () => {
    const nodes = Array.from({ length: 50 }, (_, i) => makeNode(`n-${i}`))
    const { repository, authorization, service } = makeService(nodes)
    const result = await service.findByWorkspace(READER, 'ws-1')
    expect(result).toHaveLength(50)
    expect(authorization.getContext).toHaveBeenCalledTimes(1)
    expect(repository.findByWorkspace).toHaveBeenCalledTimes(1)
  })

  it('returns a single node the principal is authorized to read', async () => {
    const { service } = makeService([makeNode('n-1')])
    await expect(service.findById(READER, 'n-1')).resolves.toMatchObject({ id: 'n-1' })
  })

  it('hides unauthorized nodes as if they did not exist (404, no existence leak)', async () => {
    const { service } = makeService([
      makeNode('n-other-dept', { departmentId: DEPT_FINANCE }),
      makeNode('n-restricted', { complianceTags: [ComplianceTag.RESTRICTED] }),
      makeNode('n-foreign-org', { organizationId: ORG_B }),
    ])
    for (const id of ['n-other-dept', 'n-restricted', 'n-foreign-org']) {
      await expect(service.findById(READER, id)).rejects.toBeInstanceOf(NotFoundException)
    }
  })

  it('audits a denied single fetch and still returns 404', async () => {
    const { audit, service } = makeService([
      makeNode('n-other-dept', { departmentId: DEPT_FINANCE }),
    ])
    await expect(service.findById(READER, 'n-other-dept')).rejects.toBeInstanceOf(NotFoundException)
    expect(audit.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        actorId: USER_ID,
        resourceType: 'knowledge-node',
        resourceId: 'n-other-dept',
        failedPolicy: 'DEPARTMENT',
      }),
    )
  })

  it('does not audit an authorized single fetch', async () => {
    const { audit, service } = makeService([makeNode('n-1')])
    await service.findById(READER, 'n-1')
    expect(audit.recordDenial).not.toHaveBeenCalled()
  })

  it('throws 404 for missing nodes', async () => {
    const { service } = makeService([])
    await expect(service.findById(READER, 'ghost')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('respects a private node the principal does not own', async () => {
    const { service } = makeService([
      makeNode('n-private', {
        metadata: { visibility: 'PRIVATE' },
        ownerId: 'someone-else',
      }),
    ])
    await expect(service.findById(READER, 'n-private')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('shows a private node the principal owns', async () => {
    const { service } = makeService([
      makeNode('n-own', { metadata: { visibility: 'PRIVATE' }, ownerId: USER_ID }),
    ])
    await expect(service.findById(READER, 'n-own')).resolves.toMatchObject({ id: 'n-own' })
  })
})

describe('KnowledgeService — permission-aware writes', () => {
  it('rejects creating a node in a department outside the accessible scope (403, DEPARTMENT)', async () => {
    const { repository, service } = makeService([])
    const error = await service
      .create(READER, 'ws-1', {
        title: 'T',
        content: 'C',
        type: NodeType.FACT,
        departmentId: DEPT_FINANCE,
      })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(PermissionDeniedException)
    expect((error as PermissionDeniedException).statusCode).toBe(403)
    expect(failingPolicy(error)).toBe('DEPARTMENT')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects creating a node with tags the principal lacks clearance for (403, COMPLIANCE)', async () => {
    const { repository, service } = makeService([])
    const error = await service
      .create(READER, 'ws-1', {
        title: 'T',
        content: 'C',
        type: NodeType.FACT,
        complianceTags: [ComplianceTag.RESTRICTED],
      })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(PermissionDeniedException)
    expect(failingPolicy(error)).toBe('COMPLIANCE')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('creates a node the principal may write', async () => {
    const { repository, service } = makeService([])
    const result = await service.create(READER, 'ws-1', {
      title: 'T',
      content: 'C',
      type: NodeType.FACT,
    })
    expect(result.id).toBe('n-created')
    expect(repository.create).toHaveBeenCalledOnce()
  })

  it('rejects moving a node into an inaccessible department on update', async () => {
    const { repository, service } = makeService([makeNode('n-1')])
    const error = await service
      .update(READER, 'n-1', { departmentId: DEPT_FINANCE })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(PermissionDeniedException)
    expect(failingPolicy(error)).toBe('DEPARTMENT')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects adding a compliance tag without clearance on update', async () => {
    const { repository, service } = makeService([makeNode('n-1')])
    const error = await service
      .update(READER, 'n-1', { complianceTags: [ComplianceTag.RESTRICTED] })
      .catch((caught: unknown) => caught)
    expect(failingPolicy(error)).toBe('COMPLIANCE')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('updates a node when the resulting state is authorized', async () => {
    const { repository, service } = makeService([makeNode('n-1')])
    const result = await service.update(READER, 'n-1', { title: 'New title' })
    expect(result.id).toBe('n-1')
    // The raw input is mapped into the Prisma shape (relation `complianceTags`
    // becomes deleteMany+create) and the actor is recorded as `updatedById`.
    expect(repository.update).toHaveBeenCalledWith(
      'n-1',
      expect.objectContaining({ title: 'New title', updatedById: USER_ID }),
    )
  })

  it('replaces compliance tags on update via the nested relation shape', async () => {
    const { repository, service } = makeService([makeNode('n-1')])
    await service.update(READER, 'n-1', {
      complianceTags: [ComplianceTag.HIPAA, ComplianceTag.CONFIDENTIAL],
    })
    expect(repository.update).toHaveBeenCalledWith(
      'n-1',
      expect.objectContaining({
        complianceTags: {
          deleteMany: {},
          create: [{ tag: ComplianceTag.HIPAA }, { tag: ComplianceTag.CONFIDENTIAL }],
        },
      }),
    )
  })

  it('still 404s when updating a missing or foreign-org node', async () => {
    const { service } = makeService([])
    await expect(service.update(READER, 'ghost', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
