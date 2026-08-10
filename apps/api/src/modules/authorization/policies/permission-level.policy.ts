import { Injectable } from '@nestjs/common'
import { PermissionAction, type PermissionLevel } from '@contextgraph/types'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import { levelDominates, minimumLevelForAction } from '../domain/permission-level'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/**
 * Hierarchical level gate. The effective requirement is the stricter of the
 * action's base minimum and any resource-specific requirement (e.g. a locked
 * node demanding ADMIN to delete). The principal's level must dominate it.
 * A higher level never bypasses the role, compliance or visibility gates.
 */
@Injectable()
export class PermissionLevelPolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.PERMISSION_LEVEL

  /** Effective minimum level for an action against a resource. */
  requiredLevel(action: PermissionAction, resource: ResourceAuthorizationContext): PermissionLevel {
    const base = minimumLevelForAction(action)
    const resourceRequirement = resource.requiredPermissionLevel
    if (
      resourceRequirement === undefined ||
      resourceRequirement === null ||
      resourceRequirement === base
    ) {
      return base
    }
    // The stricter requirement wins (lattice compare).
    return levelDominates(resourceRequirement, base) ? resourceRequirement : base
  }

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): PolicyVerdict {
    const required = this.requiredLevel(action, resource)
    if (!levelDominates(context.permissionLevel, required)) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: `Permission level ${context.permissionLevel} does not dominate required ${required}`,
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
