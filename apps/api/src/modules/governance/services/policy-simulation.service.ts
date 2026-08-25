/* Policy simulation service — tests policies without modifying production state.

Admin can test:
  User + Resource + Action → Policy Engine → ALLOW / DENY → Reason

This should NOT modify production state.
*/

import { Injectable, Inject } from '@nestjs/common'
import type { Metadata, PolicySimulationRequest, PolicySimulationResult } from '@contextgraph/types'
import { IPolicySimulationService, IPolicyRepository } from '../domain/governance.interfaces'

@Injectable()
export class PolicySimulationService implements IPolicySimulationService {
  constructor(@Inject(IPolicyRepository) private readonly policyRepo: IPolicyRepository) {}

  async simulate(request: PolicySimulationRequest): Promise<PolicySimulationResult> {
    const matchedPolicies: string[] = []
    const deniedPolicies: string[] = []

    // Load the specified policies
    for (const policyId of request.policyIds) {
      const policy = await this.policyRepo.findById(policyId)
      if (!policy || policy.status !== 'ACTIVE') continue

      // Evaluate the policy configuration against the request
      const result = this.evaluatePolicy(policy.configuration, request)
      matchedPolicies.push(policy.name)

      if (!result.allowed) {
        deniedPolicies.push(policy.name)
      }
    }

    const allowed = deniedPolicies.length === 0

    return {
      allowed,
      reason: allowed
        ? 'All evaluated policies allow this action'
        : `Denied by policies: ${deniedPolicies.join(', ')}`,
      matchedPolicies,
      deniedPolicies,
      evaluatedAt: new Date().toISOString(),
    }
  }

  private evaluatePolicy(
    configuration: Metadata,
    request: PolicySimulationRequest,
  ): { allowed: boolean; reason: string } {
    // Deterministic policy evaluation against the simulation request
    const rules = (configuration.rules as Array<Record<string, unknown>>) ?? []

    for (const rule of rules) {
      const resourceType = rule.resourceType as string | undefined
      const action = rule.action as string | undefined
      const effect = rule.effect as string | undefined

      // Check if this rule matches the request
      if (resourceType && resourceType !== request.resourceType) continue
      if (action && action !== request.action && action !== '*') continue

      // Check conditions
      const conditions = (rule.conditions as Record<string, unknown>) ?? {}
      let allConditionsMet = true

      for (const [key, value] of Object.entries(conditions)) {
        const contextValue = request.contextOverrides?.[key] ?? null
        if (contextValue !== value) {
          allConditionsMet = false
          break
        }
      }

      if (allConditionsMet) {
        if (effect === 'DENY') {
          return { allowed: false, reason: (rule.reason as string) ?? 'Denied by policy rule' }
        }
        if (effect === 'ALLOW') {
          return { allowed: true, reason: (rule.reason as string) ?? 'Allowed by policy rule' }
        }
      }
    }

    // Default: allow if no explicit deny found
    return { allowed: true, reason: 'No matching deny rules found' }
  }
}
