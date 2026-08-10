import { Injectable } from '@nestjs/common'
import type { PermissionAction } from '@contextgraph/types'
import { POLICY_NAMES, type AuthorizationPolicy } from './authorization-policy.interface'
import { PolicyOutcome, type PolicyVerdict } from '../domain/authorization-decision'
import { satisfiesTags } from '../domain/compliance'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'

/**
 * Compliance gate. A resource requiring tags (PHI + CONFIDENTIAL, RESTRICTED,
 * …) is cleared only when every required tag is present in the principal's
 * effective tag set (clearance-class implied ∪ explicit grants). A missing
 * single tag denies — the check is a subset test, deterministic and O(tags).
 */
@Injectable()
export class CompliancePolicy implements AuthorizationPolicy {
  readonly name = POLICY_NAMES.COMPLIANCE

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    _action: PermissionAction,
  ): PolicyVerdict {
    const requiredTags = resource.complianceTags
    if (requiredTags === undefined || requiredTags === null || requiredTags.length === 0) {
      return { policy: this.name, outcome: PolicyOutcome.ALLOW }
    }
    if (!satisfiesTags(context.effectiveComplianceTags, requiredTags)) {
      return {
        policy: this.name,
        outcome: PolicyOutcome.DENY,
        reason: 'Missing required compliance clearance',
      }
    }
    return { policy: this.name, outcome: PolicyOutcome.ALLOW }
  }
}
