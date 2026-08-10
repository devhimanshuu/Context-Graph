import { Injectable } from '@nestjs/common'
import { PermissionAction, type Role } from '@contextgraph/types'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/** Primitive capabilities a role may exercise. Centralizes role semantics so no controller compares roles inline. */
const ROLE_CAPABILITIES: Readonly<Record<Role, Readonly<Record<PermissionAction, boolean>>>> = {
  ADMIN: { READ: true, WRITE: true, DELETE: true, MANAGE: true },
  HOD: { READ: true, WRITE: true, DELETE: true, MANAGE: false },
  EDITOR: { READ: true, WRITE: true, DELETE: false, MANAGE: false },
  QUALITY: { READ: true, WRITE: true, DELETE: false, MANAGE: false },
  VIEWER: { READ: true, WRITE: false, DELETE: false, MANAGE: false },
  AUDITOR: { READ: true, WRITE: false, DELETE: false, MANAGE: false },
}

/**
 * Role capability gate. Runs before the permission-level gate: a role that may
 * not exercise an action at all is denied regardless of level. AUDITOR and
 * VIEWER are read-only; only ADMIN/HOD may delete; only ADMIN manages tenants.
 */
@Injectable()
export class RolePolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.ROLE

  /** Whether a role may exercise an action at all (used by the evaluator). */
  roleAllowsAction(role: Role, action: PermissionAction): boolean {
    return ROLE_CAPABILITIES[role][action]
  }

  evaluate(
    context: CompiledAuthorizationContext,
    _resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): PolicyVerdict {
    if (!this.roleAllowsAction(context.role, action)) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: `Role ${context.role} cannot perform ${action}`,
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
