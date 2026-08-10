import { Injectable } from '@nestjs/common'
import { PermissionAction, Role } from '@contextgraph/types'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import { ResourceVisibility } from '../domain/resource-context'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/**
 * Visibility gate. PUBLIC resources are open to any principal of the tenant;
 * INTERNAL likewise (tenant membership is already enforced by the
 * organization policy); PRIVATE resources are visible only to their owner —
 * org admins retain a read override but never bypass compliance.
 */
@Injectable()
export class VisibilityPolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.VISIBILITY

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): PolicyVerdict {
    if (resource.visibility === ResourceVisibility.PRIVATE) {
      const isOwner = resource.ownerId !== undefined && resource.ownerId === context.userId
      const adminOverride = action === PermissionAction.READ && context.role === Role.ADMIN
      if (!isOwner && !adminOverride) {
        return {
          policy: this.name,
          outcome: PolicyOutcome.DENY,
          reason: 'Resource is private',
        }
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
