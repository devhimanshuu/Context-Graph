import { describe, expect, it } from 'vitest'
import {
  ComplianceClearance,
  ComplianceTag,
  OrganizationStatus,
  PermissionAction,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import { PolicyPipeline } from './policy-pipeline'
import { OrganizationPolicy } from './organization.policy'
import { DepartmentPolicy } from './department.policy'
import { RolePolicy } from './role.policy'
import { PermissionLevelPolicy } from './permission-level.policy'
import { CompliancePolicy } from './compliance.policy'
import { VisibilityPolicy } from './visibility.policy'
import { PolicyOutcome } from '../domain/authorization-decision'
import { ResourceVisibility } from '../domain/resource-context'
import {
  DEPT_BACKEND,
  DEPT_FINANCE,
  ORG_B,
  USER_ID,
  makeContext,
  makeResource,
} from '../testing/authorization-fixtures'

function makePipeline(): PolicyPipeline {
  return new PolicyPipeline(
    new OrganizationPolicy(),
    new DepartmentPolicy(),
    new RolePolicy(),
    new PermissionLevelPolicy(),
    new CompliancePolicy(),
    new VisibilityPolicy(),
  )
}

describe('PolicyPipeline — role capability', () => {
  it('grants ADMIN full read/write/delete access', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.ADMIN })
    for (const action of [PermissionAction.READ, PermissionAction.WRITE, PermissionAction.DELETE]) {
      expect(pipeline.evaluate(context, makeResource(), action).allowed).toBe(true)
    }
  })

  it('allows VIEWER reads but denies writes and deletes', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.VIEWER, permissionLevel: PermissionLevel.READ })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(true)
    const write = pipeline.evaluate(context, makeResource(), PermissionAction.WRITE)
    expect(write.allowed).toBe(false)
    expect(write.failedPolicy).toBe('ROLE')
  })

  it('allows EDITOR reads and writes but denies deletes', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.EDITOR, permissionLevel: PermissionLevel.WRITE })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(true)
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.WRITE).allowed).toBe(true)
    const del = pipeline.evaluate(context, makeResource(), PermissionAction.DELETE)
    expect(del.allowed).toBe(false)
    expect(del.failedPolicy).toBe('ROLE')
  })

  it('allows HOD reads, writes and deletes within scope', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.HOD, permissionLevel: PermissionLevel.ADMIN })
    for (const action of [PermissionAction.READ, PermissionAction.WRITE, PermissionAction.DELETE]) {
      expect(pipeline.evaluate(context, makeResource(), action).allowed).toBe(true)
    }
  })

  it('restricts AUDITOR to reads', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.AUDITOR, permissionLevel: PermissionLevel.READ })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(true)
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.WRITE).allowed).toBe(false)
  })

  it('allows QUALITY reads and writes but not deletes', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.QUALITY, permissionLevel: PermissionLevel.WRITE })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(true)
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.WRITE).allowed).toBe(true)
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.DELETE).allowed).toBe(false)
  })
})

describe('PolicyPipeline — permission level', () => {
  it('denies WRITE-level delete (requires ADMIN)', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.WRITE })
    const decision = pipeline.evaluate(context, makeResource(), PermissionAction.DELETE)
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('PERMISSION_LEVEL')
  })

  it('honors a stricter resource-required level', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.EDITOR, permissionLevel: PermissionLevel.WRITE })
    const locked = makeResource({ requiredPermissionLevel: PermissionLevel.ADMIN })
    expect(pipeline.evaluate(context, locked, PermissionAction.WRITE).allowed).toBe(false)
    const admin = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.ADMIN })
    expect(pipeline.evaluate(admin, locked, PermissionAction.WRITE).allowed).toBe(true)
  })

  it('lets a higher level perform lower-level actions', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.ADMIN })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(true)
  })
})

describe('PolicyPipeline — multi-tenant isolation', () => {
  it('denies access to another organization resource', () => {
    const pipeline = makePipeline()
    const decision = pipeline.evaluate(
      makeContext(),
      makeResource({ organizationId: ORG_B }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('ORGANIZATION')
  })

  it('fails closed when the tenant is suspended', () => {
    const pipeline = makePipeline()
    const context = makeContext({ organizationStatus: OrganizationStatus.SUSPENDED })
    const decision = pipeline.evaluate(context, makeResource(), PermissionAction.READ)
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('ORGANIZATION')
  })

  it('fails closed when the tenant is archived', () => {
    const pipeline = makePipeline()
    const context = makeContext({ organizationStatus: OrganizationStatus.ARCHIVED })
    expect(pipeline.evaluate(context, makeResource(), PermissionAction.READ).allowed).toBe(false)
  })
})

describe('PolicyPipeline — department scope', () => {
  it('denies resources from a department outside the accessible set', () => {
    const pipeline = makePipeline()
    const decision = pipeline.evaluate(
      makeContext(),
      makeResource({ departmentId: DEPT_FINANCE }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('DEPARTMENT')
  })

  it('allows resources in child departments', () => {
    const pipeline = makePipeline()
    const decision = pipeline.evaluate(
      makeContext(),
      makeResource({ departmentId: DEPT_BACKEND }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(true)
  })

  it('allows organization-wide resources (no department restriction)', () => {
    const pipeline = makePipeline()
    const decision = pipeline.evaluate(
      makeContext(),
      makeResource({ departmentId: null }),
      PermissionAction.READ,
    )
    expect(decision.allowed).toBe(true)
  })
})

describe('PolicyPipeline — compliance clearance', () => {
  it('allows when the principal implies the required tag', () => {
    const pipeline = makePipeline()
    const resource = makeResource({ complianceTags: [ComplianceTag.PHI] })
    expect(pipeline.evaluate(makeContext(), resource, PermissionAction.READ).allowed).toBe(true)
  })

  it('allows multiple required tags when all are implied', () => {
    const pipeline = makePipeline()
    const resource = makeResource({
      complianceTags: [ComplianceTag.PHI, ComplianceTag.CONFIDENTIAL],
    })
    expect(pipeline.evaluate(makeContext(), resource, PermissionAction.READ).allowed).toBe(true)
  })

  it('denies when any required tag is missing', () => {
    const pipeline = makePipeline()
    const resource = makeResource({ complianceTags: [ComplianceTag.RESTRICTED] })
    const decision = pipeline.evaluate(makeContext(), resource, PermissionAction.READ)
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('COMPLIANCE')
    expect(decision.reason).toContain('compliance clearance')
  })

  it('denies a node requiring two tags when the principal has only one', () => {
    const pipeline = makePipeline()
    const context = makeContext({
      complianceClearance: ComplianceClearance.SENSITIVE,
      effectiveComplianceTags: new Set([ComplianceTag.PHI]),
    })
    const resource = makeResource({
      complianceTags: [ComplianceTag.PHI, ComplianceTag.CONFIDENTIAL],
    })
    expect(pipeline.evaluate(context, resource, PermissionAction.READ).allowed).toBe(false)
  })
})

describe('PolicyPipeline — visibility', () => {
  it('denies private resources to non-owners', () => {
    const pipeline = makePipeline()
    const resource = makeResource({
      visibility: ResourceVisibility.PRIVATE,
      ownerId: 'someone-else',
    })
    const decision = pipeline.evaluate(makeContext(), resource, PermissionAction.READ)
    expect(decision.allowed).toBe(false)
    expect(decision.failedPolicy).toBe('VISIBILITY')
  })

  it('allows private resources to their owner', () => {
    const pipeline = makePipeline()
    const resource = makeResource({ visibility: ResourceVisibility.PRIVATE, ownerId: USER_ID })
    expect(pipeline.evaluate(makeContext(), resource, PermissionAction.READ).allowed).toBe(true)
  })

  it('grants admins a read override on private resources', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.ADMIN })
    const resource = makeResource({
      visibility: ResourceVisibility.PRIVATE,
      ownerId: 'someone-else',
    })
    expect(pipeline.evaluate(context, resource, PermissionAction.READ).allowed).toBe(true)
    // Override never extends to writes.
    expect(pipeline.evaluate(context, resource, PermissionAction.WRITE).allowed).toBe(false)
  })

  it('allows PUBLIC and INTERNAL resources regardless of owner', () => {
    const pipeline = makePipeline()
    for (const visibility of [ResourceVisibility.PUBLIC, ResourceVisibility.INTERNAL]) {
      const resource = makeResource({ visibility, ownerId: 'someone-else' })
      expect(pipeline.evaluate(makeContext(), resource, PermissionAction.READ).allowed).toBe(true)
    }
  })
})

describe('PolicyPipeline — combined and decision shape', () => {
  it('allows when every policy passes and reports all evaluated policies', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.ADMIN, permissionLevel: PermissionLevel.ADMIN })
    const resource = makeResource({
      complianceTags: [ComplianceTag.INTERNAL],
      visibility: ResourceVisibility.INTERNAL,
    })
    const decision = pipeline.evaluate(context, resource, PermissionAction.DELETE)
    expect(decision.allowed).toBe(true)
    expect(decision.failedPolicy).toBeNull()
    expect(decision.evaluatedPolicies).toEqual([
      'ORGANIZATION',
      'DEPARTMENT',
      'ROLE',
      'PERMISSION_LEVEL',
      'COMPLIANCE',
      'VISIBILITY',
    ])
  })

  it('short-circuits on the first denial in deterministic order', () => {
    const pipeline = makePipeline()
    const context = makeContext({ role: Role.VIEWER, permissionLevel: PermissionLevel.READ })
    // Cross-org resource: organization policy is the first gate and must win.
    const decision = pipeline.evaluate(
      context,
      makeResource({ organizationId: ORG_B }),
      PermissionAction.WRITE,
    )
    expect(decision.failedPolicy).toBe('ORGANIZATION')
    expect(decision.evaluatedPolicies).toEqual(['ORGANIZATION'])
  })

  it('records the failing verdict with a reason', () => {
    const pipeline = makePipeline()
    const decision = pipeline.evaluate(
      makeContext(),
      makeResource({ complianceTags: [ComplianceTag.RESTRICTED] }),
      PermissionAction.READ,
    )
    const compliance = decision.verdicts.find((v) => v.policy === 'COMPLIANCE')
    expect(compliance?.outcome).toBe(PolicyOutcome.DENY)
    expect(compliance?.reason).toBeDefined()
  })
})
