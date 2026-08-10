import { describe, expect, it } from 'vitest'
import {
  ComplianceClearance,
  ComplianceTag,
  OrganizationStatus,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import { PermissionEvaluator } from './permission-evaluator'
import { PolicyPipeline } from '../policies/policy-pipeline'
import { OrganizationPolicy } from '../policies/organization.policy'
import { DepartmentPolicy } from '../policies/department.policy'
import { RolePolicy } from '../policies/role.policy'
import { PermissionLevelPolicy } from '../policies/permission-level.policy'
import { CompliancePolicy } from '../policies/compliance.policy'
import { VisibilityPolicy } from '../policies/visibility.policy'
import {
  DEPT_BACKEND,
  DEPT_FINANCE,
  ORG_A,
  ORG_B,
  makeContext,
} from '../testing/authorization-fixtures'

function makeEvaluator(): PermissionEvaluator {
  const pipeline = new PolicyPipeline(
    new OrganizationPolicy(),
    new DepartmentPolicy(),
    new RolePolicy(),
    new PermissionLevelPolicy(),
    new CompliancePolicy(),
    new VisibilityPolicy(),
  )
  return new PermissionEvaluator(pipeline)
}

describe('PermissionEvaluator — predicates', () => {
  const evaluator = makeEvaluator()

  it('canAccessOrganization only within the compiled tenant while active', () => {
    const context = makeContext()
    expect(evaluator.canAccessOrganization(context, ORG_A)).toBe(true)
    expect(evaluator.canAccessOrganization(context, ORG_B)).toBe(false)
    const suspended = makeContext({ organizationStatus: OrganizationStatus.SUSPENDED })
    expect(evaluator.canAccessOrganization(suspended, ORG_A)).toBe(false)
  })

  it('canAccessDepartment matches the compiled accessible set', () => {
    const context = makeContext()
    expect(evaluator.canAccessDepartment(context, DEPT_BACKEND)).toBe(true)
    expect(evaluator.canAccessDepartment(context, DEPT_FINANCE)).toBe(false)
  })

  it('hasPermissionLevel applies dominance', () => {
    const context = makeContext({ permissionLevel: PermissionLevel.WRITE })
    expect(evaluator.hasPermissionLevel(context, PermissionLevel.WRITE)).toBe(true)
    expect(evaluator.hasPermissionLevel(context, PermissionLevel.READ)).toBe(true)
    expect(evaluator.hasPermissionLevel(context, PermissionLevel.ADMIN)).toBe(false)
  })

  it('hasComplianceClearance applies dominance', () => {
    const context = makeContext({ complianceClearance: ComplianceClearance.RESTRICTED })
    expect(evaluator.hasComplianceClearance(context, ComplianceClearance.SENSITIVE)).toBe(true)
    expect(evaluator.hasComplianceClearance(context, ComplianceClearance.CRITICAL)).toBe(false)
  })

  it('hasComplianceTag reflects the effective set', () => {
    const context = makeContext()
    expect(evaluator.hasComplianceTag(context, ComplianceTag.PHI)).toBe(true)
    expect(evaluator.hasComplianceTag(context, ComplianceTag.RESTRICTED)).toBe(false)
  })

  it('isRoleAllowed is a simple membership test', () => {
    const context = makeContext({ role: Role.EDITOR })
    expect(evaluator.isRoleAllowed(context, [Role.EDITOR, Role.ADMIN])).toBe(true)
    expect(evaluator.isRoleAllowed(context, [Role.ADMIN])).toBe(false)
  })
})
