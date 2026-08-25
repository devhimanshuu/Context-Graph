/* Governance Module — Phase 17 composition boundary.

The governance module is the ENTERPRISE CONTROL PLANE.
It configures and governs — it does NOT replace existing engines.

Separation of authorities:
  GOVERNANCE MODULE  → configuration, administration, policy management, audit, usage
  PERMISSION ENGINE  → authorization decisions
  RULE ENGINE        → deterministic policy evaluation
  MODEL GATEWAY      → model communication
  AGENT RUNTIME      → agent execution
  WORKFLOW ENGINE    → workflow execution
*/

import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../authorization/authorization.module'
import { PermissionsModule } from '../permissions/permissions.module'

// Controller
import { GovernanceController } from './governance.controller'

// Domain interfaces (abstract DI tokens)
import {
  IOrganizationSettingsRepository,
  IMembershipRepository,
  ITeamRepository,
  IRoleRepository,
  IPolicyRepository,
  IAgentGovernanceRepository,
  IModelGovernanceRepository,
  IBudgetRepository,
  IUsageRepository,
  IAuditRepository,
  IBreakGlassRepository,
  IGovernanceAnalyticsService,
  IPolicySimulationService,
  IBudgetEnforcementService,
} from './domain/governance.interfaces'

// Prisma repositories
import { MembershipPrismaRepository } from './repositories/membership.repository'
import { TeamPrismaRepository } from './repositories/team.repository'
import { RolePrismaRepository } from './repositories/role.repository'
import { PolicyPrismaRepository } from './repositories/policy.repository'
import { AgentGovernancePrismaRepository } from './repositories/agent-governance.repository'
import { ModelGovernancePrismaRepository } from './repositories/model-governance.repository'
import { BudgetPrismaRepository } from './repositories/budget.repository'
import { UsagePrismaRepository } from './repositories/usage.repository'
import { AuditPrismaRepository } from './repositories/audit.repository'
import { BreakGlassPrismaRepository } from './repositories/break-glass.repository'

// Services
import { BudgetEnforcementService } from './services/budget-enforcement.service'
import { PolicySimulationService } from './services/policy-simulation.service'
import { GovernanceAnalyticsService } from './services/governance-analytics.service'

// Settings repository (inline since it's simple)
import { Injectable } from '@nestjs/common'
import type { OrganizationSettings } from '@contextgraph/types'
import { DEFAULT_ORGANIZATION_SETTINGS } from '@contextgraph/types'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
class OrganizationSettingsPrismaRepository implements IOrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } })
    if (!org) return DEFAULT_ORGANIZATION_SETTINGS
    const config = (org.configuration as Record<string, unknown>) ?? {}
    return { ...DEFAULT_ORGANIZATION_SETTINGS, ...config } as OrganizationSettings
  }

  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>,
  ): Promise<OrganizationSettings> {
    const current = await this.getSettings(organizationId)
    const merged = { ...current, ...settings }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { configuration: merged as never },
    })
    return merged
  }
}

@Module({
  imports: [AuthorizationModule, PermissionsModule],
  controllers: [GovernanceController],
  providers: [
    // --- Repositories ---
    { provide: IOrganizationSettingsRepository, useClass: OrganizationSettingsPrismaRepository },
    { provide: IMembershipRepository, useClass: MembershipPrismaRepository },
    { provide: ITeamRepository, useClass: TeamPrismaRepository },
    { provide: IRoleRepository, useClass: RolePrismaRepository },
    { provide: IPolicyRepository, useClass: PolicyPrismaRepository },
    { provide: IAgentGovernanceRepository, useClass: AgentGovernancePrismaRepository },
    { provide: IModelGovernanceRepository, useClass: ModelGovernancePrismaRepository },
    { provide: IBudgetRepository, useClass: BudgetPrismaRepository },
    { provide: IUsageRepository, useClass: UsagePrismaRepository },
    { provide: IAuditRepository, useClass: AuditPrismaRepository },
    { provide: IBreakGlassRepository, useClass: BreakGlassPrismaRepository },

    // --- Services ---
    { provide: IBudgetEnforcementService, useClass: BudgetEnforcementService },
    { provide: IPolicySimulationService, useClass: PolicySimulationService },
    { provide: IGovernanceAnalyticsService, useClass: GovernanceAnalyticsService },
  ],
  exports: [
    IOrganizationSettingsRepository,
    IMembershipRepository,
    ITeamRepository,
    IRoleRepository,
    IPolicyRepository,
    IAgentGovernanceRepository,
    IModelGovernanceRepository,
    IBudgetRepository,
    IUsageRepository,
    IAuditRepository,
    IBreakGlassRepository,
    IBudgetEnforcementService,
    IPolicySimulationService,
    IGovernanceAnalyticsService,
  ],
})
export class GovernanceModule {}
