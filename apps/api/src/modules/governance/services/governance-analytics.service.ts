/* Governance analytics service — aggregates overview metrics for governance dashboard. */

import { Injectable, Inject } from '@nestjs/common'
import type { EntityId, GovernanceOverview } from '@contextgraph/types'
import {
  IGovernanceAnalyticsService,
  IMembershipRepository,
  IAgentGovernanceRepository,
  IPolicyRepository,
  IAuditRepository,
  IUsageRepository,
} from '../domain/governance.interfaces'

@Injectable()
export class GovernanceAnalyticsService implements IGovernanceAnalyticsService {
  constructor(
    @Inject(IMembershipRepository) private readonly membershipRepo: IMembershipRepository,
    @Inject(IAgentGovernanceRepository) private readonly agentRepo: IAgentGovernanceRepository,
    @Inject(IPolicyRepository) private readonly policyRepo: IPolicyRepository,
    @Inject(IAuditRepository) private readonly auditRepo: IAuditRepository,
    @Inject(IUsageRepository) private readonly usageRepo: IUsageRepository,
  ) {}

  async getOverview(organizationId: EntityId): Promise<GovernanceOverview> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const nowISO = now.toISOString()

    const [memberships, agents, policies, usage, authDenials] = await Promise.all([
      this.membershipRepo.findByOrganization(organizationId),
      this.agentRepo.findByOrganization(organizationId, 'ACTIVE'),
      this.policyRepo.findByOrganization(organizationId),
      this.usageRepo.getTotals(organizationId, thirtyDaysAgo, nowISO),
      this.auditRepo.countByOrganization(organizationId),
    ])

    const activeUsers = memberships.filter((m) => m.status === 'ACTIVE').length
    const activePolicies = policies.filter((p) => p.status === 'ACTIVE').length

    return {
      totalUsers: memberships.length,
      activeUsers,
      activeAgents: agents.length,
      activeWorkflows: 0, // Would need workflow governance repository
      activePolicies,
      securityEvents: authDenials,
      monthlyCost: usage.totalCost,
      budgetUsage: 0, // Would need budget repository aggregation
      failedExecutions: 0, // Would need execution repository
      authorizationDenials: authDenials,
    }
  }
}
