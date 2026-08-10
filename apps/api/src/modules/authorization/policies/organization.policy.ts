import { Injectable } from '@nestjs/common'
import { OrganizationStatus } from '@contextgraph/types'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/**
 * Multi-tenant boundary. The resource's tenant must equal the principal's
 * tenant; cross-organization access is denied unless an explicit future
 * cross-tenant policy is inserted before this one. Runs first because it is
 * the cheapest and most security-critical check.
 */
@Injectable()
export class OrganizationPolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.ORGANIZATION

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): PolicyVerdict {
    if (resource.organizationId !== context.organizationId) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: 'Resource belongs to another organization',
      }
    }
    if (
      context.organizationStatus === OrganizationStatus.SUSPENDED ||
      context.organizationStatus === OrganizationStatus.ARCHIVED
    ) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: 'Organization is not active',
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
