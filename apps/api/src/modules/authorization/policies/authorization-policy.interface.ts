import type { PermissionAction } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'
import type { PolicyVerdict } from '../domain/authorization-decision'

/** Stable names of the built-in policies (pipeline order in policy-pipeline). */
export const POLICY_NAMES = {
  ORGANIZATION: 'ORGANIZATION',
  DEPARTMENT: 'DEPARTMENT',
  ROLE: 'ROLE',
  PERMISSION_LEVEL: 'PERMISSION_LEVEL',
  COMPLIANCE: 'COMPLIANCE',
  VISIBILITY: 'VISIBILITY',
} as const
export type PolicyName = (typeof POLICY_NAMES)[keyof typeof POLICY_NAMES]

/**
 * One composable authorization policy. Each policy owns a single concern and
 * returns ALLOW, DENY or NOT_APPLICABLE — never throws for a normal denial.
 * The pipeline composes them in a fixed, documented order; future ABAC/PBAC
 * policies plug in by implementing this same contract.
 */
export interface AuthorizationPolicy {
  readonly name: PolicyName
  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): PolicyVerdict
}
