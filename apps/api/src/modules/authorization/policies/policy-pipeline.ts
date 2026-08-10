import { Injectable, type Provider } from '@nestjs/common'
import type { PermissionAction } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'
import type { AuthorizationDecision, PolicyVerdict } from '../domain/authorization-decision'
import { PolicyOutcome } from '../domain/authorization-decision'
import type { AuthorizationPolicy } from './authorization-policy.interface'
import { OrganizationPolicy } from './organization.policy'
import { DepartmentPolicy } from './department.policy'
import { RolePolicy } from './role.policy'
import { PermissionLevelPolicy } from './permission-level.policy'
import { CompliancePolicy } from './compliance.policy'
import { VisibilityPolicy } from './visibility.policy'

/**
 * Composes the policies into a single decision. Order is fixed and documented:
 *
 *   Organization → Department → Role → Permission Level → Compliance → Visibility
 *
 * Rationale: the tenant boundary is the cheapest and most critical check, so it
 * runs first; department scope narrows the resource surface before any
 * capability check; role gating precedes level gating so read-only roles are
 * rejected before level arithmetic; compliance and visibility are deliberate
 * last-mile gates that no capability may bypass. Evaluation short-circuits on
 * the first DENY (fail-closed); every evaluated policy is recorded for audit.
 *
 * Future ABAC/PBAC policies register here (or via injection) without touching
 * the evaluator or any consumer.
 */
@Injectable()
export class PolicyPipeline {
  private readonly policies: readonly AuthorizationPolicy[]

  constructor(
    organizationPolicy: OrganizationPolicy,
    departmentPolicy: DepartmentPolicy,
    rolePolicy: RolePolicy,
    permissionLevelPolicy: PermissionLevelPolicy,
    compliancePolicy: CompliancePolicy,
    visibilityPolicy: VisibilityPolicy,
  ) {
    this.policies = [
      organizationPolicy,
      departmentPolicy,
      rolePolicy,
      permissionLevelPolicy,
      compliancePolicy,
      visibilityPolicy,
    ]
  }

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): AuthorizationDecision {
    const verdicts: PolicyVerdict[] = []
    for (const policy of this.policies) {
      const verdict = policy.evaluate(context, resource, action)
      verdicts.push(verdict)
      if (verdict.outcome === PolicyOutcome.DENY) {
        return {
          allowed: false,
          reason: verdict.reason ?? 'Authorization denied',
          failedPolicy: verdict.policy,
          evaluatedPolicies: verdicts.map((v) => v.policy),
          verdicts,
        }
      }
    }
    return {
      allowed: true,
      reason: 'Authorized',
      failedPolicy: null,
      evaluatedPolicies: verdicts.map((v) => v.policy),
      verdicts,
    }
  }
}

/** Provider list helper for module registration (keeps the module file small). */
export const policyProviders: Provider[] = [
  OrganizationPolicy,
  DepartmentPolicy,
  RolePolicy,
  PermissionLevelPolicy,
  CompliancePolicy,
  VisibilityPolicy,
  PolicyPipeline,
]
