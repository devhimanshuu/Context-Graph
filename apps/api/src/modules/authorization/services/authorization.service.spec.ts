import { describe, expect, it, vi } from 'vitest'
import {
  ComplianceClearance,
  OrganizationStatus,
  PermissionAction,
  PermissionLevel,
  Role,
  type AuthenticatedUser,
} from '@contextgraph/types'
import { AuthorizationService } from './authorization.service'
import { PermissionCompiler } from '../compiler/permission-compiler'
import { PermissionEvaluator } from '../evaluator/permission-evaluator'
import { PolicyPipeline } from '../policies/policy-pipeline'
import { OrganizationPolicy } from '../policies/organization.policy'
import { DepartmentPolicy } from '../policies/department.policy'
import { RolePolicy } from '../policies/role.policy'
import { PermissionLevelPolicy } from '../policies/permission-level.policy'
import { CompliancePolicy } from '../policies/compliance.policy'
import { VisibilityPolicy } from '../policies/visibility.policy'
import { InMemoryAuthorizationCache } from '../cache/in-memory-authorization-cache'
import { InMemoryAuthorizationMetrics } from '../metrics/authorization-metrics'
import {
  AuthorizationContextMissingException,
  PermissionDeniedException,
} from '../errors/authorization-errors'
import type { IAuthorizationDataRepository } from '../repositories/authorization-data.repository'
import {
  DEPT_BACKEND,
  DEPT_ENGINEERING,
  ORG_A,
  ORG_B,
  USER_ID,
  makeResource,
  makeUserData,
} from '../testing/authorization-fixtures'

const ADMIN_USER: AuthenticatedUser = {
  id: USER_ID,
  organizationId: ORG_A,
  departmentId: DEPT_ENGINEERING,
  email: 'admin@acme.test',
  name: 'Admin',
  role: Role.ADMIN,
  permissionLevel: PermissionLevel.ADMIN,
  complianceClearance: ComplianceClearance.SENSITIVE,
}

function makeService() {
  const repository = {
    loadUser: vi.fn(async () => makeUserData()),
    loadDepartmentSubtree: vi.fn(async () => [DEPT_BACKEND]),
    loadOrganizationStatus: vi.fn(async () => OrganizationStatus.ACTIVE),
  } as unknown as IAuthorizationDataRepository
  const pipeline = new PolicyPipeline(
    new OrganizationPolicy(),
    new DepartmentPolicy(),
    new RolePolicy(),
    new PermissionLevelPolicy(),
    new CompliancePolicy(),
    new VisibilityPolicy(),
  )
  const evaluator = new PermissionEvaluator(pipeline)
  const compiler = new PermissionCompiler()
  const cache = new InMemoryAuthorizationCache()
  const metrics = new InMemoryAuthorizationMetrics()
  const audit = {
    recordDenial: vi.fn(async () => undefined),
    recordEvent: vi.fn(async () => undefined),
  }
  const service = new AuthorizationService(repository, compiler, evaluator, cache, metrics, audit)
  return { repository, cache, metrics, audit, service }
}

describe('AuthorizationService — compilation and cache', () => {
  it('compiles from server data and reuses the cached context (no reload)', async () => {
    const { repository, metrics, service } = makeService()
    const first = await service.getContext(ADMIN_USER)
    const second = await service.getContext(ADMIN_USER)
    expect(first).toBe(second)
    expect(repository.loadUser).toHaveBeenCalledTimes(1)
    const snapshot = metrics.snapshot()
    expect(snapshot.cacheMisses).toBe(1)
    expect(snapshot.cacheHits).toBe(1)
  })

  it('reloads after explicit invalidation', async () => {
    const { repository, service } = makeService()
    await service.getContext(ADMIN_USER)
    await service.invalidate(USER_ID)
    await service.getContext(ADMIN_USER)
    expect(repository.loadUser).toHaveBeenCalledTimes(2)
  })

  it('reloads after the TTL expires (staleness is bounded)', async () => {
    vi.useFakeTimers()
    try {
      const { repository, service } = makeService()
      await service.getContext(ADMIN_USER)
      vi.advanceTimersByTime(61_000)
      await service.getContext(ADMIN_USER)
      expect(repository.loadUser).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws when the user row is missing', async () => {
    const { repository, service } = makeService()
    repository.loadUser = vi.fn(async () => null)
    await expect(service.getContext(ADMIN_USER)).rejects.toBeInstanceOf(
      AuthorizationContextMissingException,
    )
  })

  it('fails closed when the tenant cannot be resolved', async () => {
    const { repository, service } = makeService()
    repository.loadOrganizationStatus = vi.fn(async () => null)
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource(),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('ORGANIZATION')
  })

  it('never performs a database query per evaluated node', async () => {
    const { repository, service } = makeService()
    const resources = Array.from({ length: 100 }, (_, i) =>
      makeResource({ id: `node-${i}`, complianceTags: [] }),
    )
    for (const resource of resources) {
      await service.canReadNode(ADMIN_USER, resource)
    }
    // One compile → one user query; all 100 checks are in-memory.
    expect(repository.loadUser).toHaveBeenCalledTimes(1)
    expect(repository.loadDepartmentSubtree).toHaveBeenCalledTimes(1)
  })
})

describe('AuthorizationService — security boundaries', () => {
  it('denies cross-organization access and audits it', async () => {
    const { audit, metrics, service } = makeService()
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource({ organizationId: ORG_B }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('ORGANIZATION')
    expect(audit.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        actorId: USER_ID,
        resourceId: 'node-1',
        failedPolicy: 'ORGANIZATION',
      }),
    )
    expect(metrics.snapshot().denialReasons['ORGANIZATION']).toBe(1)
  })

  it('does not trust a caller-claimed role (spoofing fails)', async () => {
    const { repository, service } = makeService()
    repository.loadUser = vi.fn(async () =>
      makeUserData({ role: Role.VIEWER, permissionLevel: PermissionLevel.READ }),
    )
    // The caller claims ADMIN, but the compiled context is VIEWER from the DB.
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource(),
      PermissionAction.WRITE,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('ROLE')
  })

  it('does not trust a caller-claimed permission level (escalation fails)', async () => {
    const { repository, service } = makeService()
    repository.loadUser = vi.fn(async () =>
      makeUserData({ role: Role.EDITOR, permissionLevel: PermissionLevel.READ }),
    )
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource(),
      PermissionAction.WRITE,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('PERMISSION_LEVEL')
  })

  it('denies restricted content without clearance', async () => {
    const { repository, service } = makeService()
    repository.loadUser = vi.fn(async () =>
      makeUserData({ complianceClearance: ComplianceClearance.STANDARD }),
    )
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource({ complianceTags: ['PHI', 'CONFIDENTIAL'] }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('COMPLIANCE')
  })

  it('denies access to another department restricted knowledge', async () => {
    const { service } = makeService()
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource({ departmentId: 'dept-finance' }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('DEPARTMENT')
  })
})

describe('AuthorizationService — decision and predicate surface', () => {
  it('allows a fully authorized read without auditing a denial', async () => {
    const { audit, service } = makeService()
    const decision = await service.evaluateResource(
      ADMIN_USER,
      makeResource(),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(true)
    expect(audit.recordDenial).not.toHaveBeenCalled()
  })

  it('checkAction throws a typed denial with the failing policy', async () => {
    const { repository, service } = makeService()
    repository.loadUser = vi.fn(async () =>
      makeUserData({ role: Role.VIEWER, permissionLevel: PermissionLevel.READ }),
    )
    await expect(
      service.checkAction(ADMIN_USER, 'knowledge-node', PermissionAction.WRITE),
    ).rejects.toBeInstanceOf(PermissionDeniedException)
  })

  it('exposes org/department/level/clearance/role predicates', async () => {
    const { repository, service } = makeService()
    // The compiled context mirrors the DB row, so make the row match the caller claims.
    repository.loadUser = vi.fn(async () =>
      makeUserData({
        role: Role.ADMIN,
        permissionLevel: PermissionLevel.ADMIN,
      }),
    )
    await expect(service.canAccessOrganization(ADMIN_USER, ORG_A)).resolves.toBe(true)
    await expect(service.canAccessOrganization(ADMIN_USER, ORG_B)).resolves.toBe(false)
    await expect(service.canAccessDepartment(ADMIN_USER, DEPT_BACKEND)).resolves.toBe(true)
    await expect(service.hasPermissionLevel(ADMIN_USER, PermissionLevel.WRITE)).resolves.toBe(true)
    await expect(service.hasPermissionLevel(ADMIN_USER, PermissionLevel.ADMIN)).resolves.toBe(true)
    await expect(
      service.hasComplianceClearance(ADMIN_USER, ComplianceClearance.SENSITIVE),
    ).resolves.toBe(true)
    await expect(service.isRoleAllowed(ADMIN_USER, [Role.ADMIN])).resolves.toBe(true)
    await expect(service.isRoleAllowed(ADMIN_USER, [Role.VIEWER])).resolves.toBe(false)
  })
})
