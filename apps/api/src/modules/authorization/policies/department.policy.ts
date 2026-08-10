import { Injectable } from '@nestjs/common'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/**
 * Department scope. A resource tied to a department is reachable only by
 * principals whose accessible set (own department + descendants + explicit
 * grants, compiled once) contains it. Organization-wide resources (null
 * department) carry no department restriction. The set lives on the compiled
 * context, so this check is O(1) per resource.
 */
@Injectable()
export class DepartmentPolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.DEPARTMENT

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): PolicyVerdict {
    const departmentId = resource.departmentId
    if (departmentId === undefined || departmentId === null) {
      return { policy: this.name, outcome: PolicyOutcome.ALLOW }
    }
    if (!context.accessibleDepartmentIds.has(departmentId)) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: 'Resource belongs to a department outside the authorized scope',
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
