import { Injectable } from '@nestjs/common'
import { ComplianceTag, type EntityId, type OrganizationStatus } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import { COMPLIANCE_GRANTS_METADATA_KEY, tagsImpliedByClearance } from '../domain/compliance'
import type { AuthorizationUserData } from '../repositories/authorization-data.repository'

/** Metadata key carrying explicit extra department grants (ids, not codes). */
export const AUTHORIZED_DEPARTMENT_IDS_METADATA_KEY = 'authorizedDepartmentIds'

/** Everything the compiler needs — assembled once by the caller from trusted sources. */
export interface AuthorizationCompileInput {
  readonly user: AuthorizationUserData
  readonly organizationStatus: OrganizationStatus
  readonly departmentSubtree: readonly EntityId[]
  readonly sessionId?: string | null
}

/**
 * Compilation contract. The compiler is pure (no I/O): it folds raw,
 * server-loaded data into an immutable runtime context optimized for O(1)
 * in-memory checks. Explicit grants are parsed defensively — values that are
 * not known enum members are dropped, never trusted.
 */
export abstract class IAuthorizationCompiler {
  abstract compile(input: AuthorizationCompileInput): CompiledAuthorizationContext
}

@Injectable()
export class PermissionCompiler implements IAuthorizationCompiler {
  compile(input: AuthorizationCompileInput): CompiledAuthorizationContext {
    const { user } = input
    const metadata = user.metadata

    const effectiveTags = new Set(tagsImpliedByClearance(user.complianceClearance))
    for (const tag of readTagArray(metadata[COMPLIANCE_GRANTS_METADATA_KEY])) {
      effectiveTags.add(tag)
    }

    const accessibleDepartments = new Set<EntityId>()
    if (user.departmentId !== null) {
      accessibleDepartments.add(user.departmentId)
      for (const descendant of input.departmentSubtree) {
        accessibleDepartments.add(descendant)
      }
    }
    for (const departmentId of readStringArray(metadata[AUTHORIZED_DEPARTMENT_IDS_METADATA_KEY])) {
      accessibleDepartments.add(departmentId)
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      organizationStatus: input.organizationStatus,
      departmentId: user.departmentId,
      role: user.role,
      permissionLevel: user.permissionLevel,
      complianceClearance: user.complianceClearance,
      effectiveComplianceTags: effectiveTags,
      accessibleDepartmentIds: accessibleDepartments,
      attributes: Object.freeze({ ...metadata }),
      sessionId: input.sessionId ?? null,
      compiledAt: new Date().toISOString(),
      sourceVersion: user.updatedAt,
    }
  }
}

/** Reads an explicit compliance-tag grant list, dropping unknown values (fail-safe). */
function readTagArray(value: unknown): readonly ComplianceTag[] {
  if (!Array.isArray(value)) return []
  const tags: ComplianceTag[] = []
  for (const item of value) {
    if (typeof item === 'string' && isComplianceTag(item)) tags.push(item)
  }
  return tags
}

function isComplianceTag(value: string): value is ComplianceTag {
  return Object.values(ComplianceTag).includes(value as ComplianceTag)
}

/** Reads a string id list (department grants), dropping malformed entries. */
function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}
