import {
  ComplianceClearance,
  ComplianceTag,
  OrganizationStatus,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import { ResourceVisibility, type ResourceAuthorizationContext } from '../domain/resource-context'
import { tagsImpliedByClearance } from '../domain/compliance'
import type { AuthorizationUserData } from '../repositories/authorization-data.repository'

export const ORG_A = 'org-a'
export const ORG_B = 'org-b'
export const USER_ID = 'user-1'
export const WORKSPACE_ID = 'ws-1'
export const DEPT_ENGINEERING = 'dept-engineering'
export const DEPT_BACKEND = 'dept-backend'
export const DEPT_FRONTEND = 'dept-frontend'
export const DEPT_FINANCE = 'dept-finance'

/** A default compiled context: EDITOR/WRITE/SENSITIVE in org A, engineering scope. */
export function makeContext(
  overrides: Partial<CompiledAuthorizationContext> = {},
): CompiledAuthorizationContext {
  return {
    userId: USER_ID,
    organizationId: ORG_A,
    organizationStatus: OrganizationStatus.ACTIVE,
    departmentId: DEPT_ENGINEERING,
    role: Role.EDITOR,
    permissionLevel: PermissionLevel.WRITE,
    complianceClearance: ComplianceClearance.SENSITIVE,
    effectiveComplianceTags: new Set(tagsImpliedByClearance(ComplianceClearance.SENSITIVE)),
    accessibleDepartmentIds: new Set([DEPT_ENGINEERING, DEPT_BACKEND]),
    attributes: {},
    sessionId: null,
    compiledAt: '2026-01-01T00:00:00.000Z',
    sourceVersion: 'v1',
    ...overrides,
  }
}

/** A default resource: a knowledge node in org A, engineering, INTERNAL, no tags. */
export function makeResource(
  overrides: Partial<ResourceAuthorizationContext> = {},
): ResourceAuthorizationContext {
  return {
    id: 'node-1',
    resourceType: 'knowledge-node',
    organizationId: ORG_A,
    workspaceId: WORKSPACE_ID,
    departmentId: DEPT_ENGINEERING,
    ownerId: null,
    requiredPermissionLevel: null,
    complianceTags: [],
    visibility: ResourceVisibility.INTERNAL,
    status: 'ACTIVE',
    attributes: {},
    ...overrides,
  }
}

/** A raw principal record as loaded from the database. */
export function makeUserData(
  overrides: Partial<AuthorizationUserData> = {},
): AuthorizationUserData {
  return {
    id: USER_ID,
    organizationId: ORG_A,
    departmentId: DEPT_ENGINEERING,
    role: Role.EDITOR,
    permissionLevel: PermissionLevel.WRITE,
    complianceClearance: ComplianceClearance.SENSITIVE,
    status: 'ACTIVE',
    metadata: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export const ALL_ROLES = Object.values(Role) as Role[]
export const ALL_TAGS = Object.values(ComplianceTag) as ComplianceTag[]
