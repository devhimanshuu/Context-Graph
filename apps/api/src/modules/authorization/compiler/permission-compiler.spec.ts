import { describe, expect, it } from 'vitest'
import {
  ComplianceClearance,
  ComplianceTag,
  OrganizationStatus,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import { PermissionCompiler } from './permission-compiler'
import { AUTHORIZED_DEPARTMENT_IDS_METADATA_KEY } from './permission-compiler'
import { COMPLIANCE_GRANTS_METADATA_KEY } from '../domain/compliance'
import {
  DEPT_BACKEND,
  DEPT_ENGINEERING,
  DEPT_FINANCE,
  ORG_A,
  makeUserData,
} from '../testing/authorization-fixtures'

const compiler = new PermissionCompiler()

function compileWith(overrides: Parameters<typeof makeUserData>[0] = {}) {
  return compiler.compile({
    user: makeUserData(overrides),
    organizationStatus: OrganizationStatus.ACTIVE,
    departmentSubtree: [DEPT_BACKEND],
  })
}

describe('PermissionCompiler', () => {
  it('derives role, level and clearance from the server-loaded row, never from caller claims', () => {
    const context = compileWith({
      role: Role.AUDITOR,
      permissionLevel: PermissionLevel.READ,
      complianceClearance: ComplianceClearance.STANDARD,
    })
    expect(context.role).toBe(Role.AUDITOR)
    expect(context.permissionLevel).toBe(PermissionLevel.READ)
    expect(context.complianceClearance).toBe(ComplianceClearance.STANDARD)
    expect(context.organizationId).toBe(ORG_A)
  })

  it('builds the accessible department set from own + descendants + explicit grants', () => {
    const context = compileWith({
      metadata: {
        [AUTHORIZED_DEPARTMENT_IDS_METADATA_KEY]: [DEPT_FINANCE],
      },
    })
    expect(context.accessibleDepartmentIds.has(DEPT_ENGINEERING)).toBe(true)
    expect(context.accessibleDepartmentIds.has(DEPT_BACKEND)).toBe(true)
    expect(context.accessibleDepartmentIds.has(DEPT_FINANCE)).toBe(true)
  })

  it('leaves the department set empty for users without a department', () => {
    const context = compileWith({ departmentId: null })
    expect(context.accessibleDepartmentIds.size).toBe(0)
  })

  it('folds explicit compliance grants into the effective tag set', () => {
    const context = compileWith({
      complianceClearance: ComplianceClearance.STANDARD,
      metadata: { [COMPLIANCE_GRANTS_METADATA_KEY]: [ComplianceTag.PHI] },
    })
    expect(context.effectiveComplianceTags.has(ComplianceTag.PHI)).toBe(true)
    expect(context.effectiveComplianceTags.has(ComplianceTag.CONFIDENTIAL)).toBe(false)
  })

  it('drops unknown grant values instead of trusting them', () => {
    const context = compileWith({
      metadata: {
        [COMPLIANCE_GRANTS_METADATA_KEY]: [ComplianceTag.PHI, 'NOT_A_REAL_TAG', 42],
        [AUTHORIZED_DEPARTMENT_IDS_METADATA_KEY]: ['', DEPT_FINANCE],
      },
    })
    expect(context.effectiveComplianceTags.has(ComplianceTag.PHI)).toBe(true)
    expect(context.effectiveComplianceTags.has('NOT_A_REAL_TAG' as ComplianceTag)).toBe(false)
    expect(context.accessibleDepartmentIds.has(DEPT_FINANCE)).toBe(true)
    expect(context.accessibleDepartmentIds.has('')).toBe(false)
  })

  it('exposes frozen attributes and session metadata', () => {
    const context = compileWith({ metadata: { theme: 'dark' } })
    expect(Object.isFrozen(context.attributes)).toBe(true)
    expect(context.attributes['theme']).toBe('dark')
    expect(context.sessionId).toBeNull()
    expect(context.sourceVersion).toBe('2026-01-01T00:00:00.000Z')
  })
})
