/* Governance API controller — REST endpoints for the enterprise control plane.

Every endpoint must use the existing Permission Engine for authorization.
The governance module configures and governs — it does NOT replace existing engines.
*/

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import {
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
  IOrganizationSettingsRepository,
  IGovernanceAnalyticsService,
  IPolicySimulationService,
  IBudgetEnforcementService,
} from './domain/governance.interfaces'
import { uuid } from '../../common/utils/uuid'
import {
  MembershipResponseDto,
  TeamResponseDto,
  RoleResponseDto,
  PolicyResponseDto,
  AgentDefinitionResponseDto,
  ModelProviderResponseDto,
  BudgetResponseDto,
  UsageResponseDto,
  AuditEventResponseDto,
  AuditChainResponseDto,
  GovernanceOverviewResponseDto,
  PolicySimulationResponseDto,
  BreakGlassResponseDto,
  OrganizationSettingsResponseDto,
} from './dto/governance.dto'

@ApiTags('Governance')
@Controller('governance')
export class GovernanceController {
  constructor(
    @Inject(IMembershipRepository) private readonly membershipRepo: IMembershipRepository,
    @Inject(ITeamRepository) private readonly teamRepo: ITeamRepository,
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    @Inject(IPolicyRepository) private readonly policyRepo: IPolicyRepository,
    @Inject(IAgentGovernanceRepository) private readonly agentRepo: IAgentGovernanceRepository,
    @Inject(IModelGovernanceRepository) private readonly modelRepo: IModelGovernanceRepository,
    @Inject(IBudgetRepository) private readonly budgetRepo: IBudgetRepository,
    @Inject(IUsageRepository) private readonly usageRepo: IUsageRepository,
    @Inject(IAuditRepository) private readonly auditRepo: IAuditRepository,
    @Inject(IBreakGlassRepository) private readonly breakGlassRepo: IBreakGlassRepository,
    @Inject(IOrganizationSettingsRepository)
    private readonly settingsRepo: IOrganizationSettingsRepository,
    @Inject(IGovernanceAnalyticsService)
    private readonly analyticsService: IGovernanceAnalyticsService,
    @Inject(IPolicySimulationService) private readonly simulationService: IPolicySimulationService,
    @Inject(IBudgetEnforcementService) private readonly budgetService: IBudgetEnforcementService,
  ) {}

  // -------------------------------------------------------------------------
  // Governance Overview
  // -------------------------------------------------------------------------

  @Get('overview')
  @ApiOperation({ summary: 'Get governance overview' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GovernanceOverviewResponseDto> {
    return this.analyticsService.getOverview(user.organizationId)
  }

  // -------------------------------------------------------------------------
  // Organization Settings
  // -------------------------------------------------------------------------

  @Get('settings')
  @ApiOperation({ summary: 'Get organization settings' })
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationSettingsResponseDto> {
    const settings = await this.settingsRepo.getSettings(user.organizationId)
    return {
      defaultModel: settings.defaultModel,
      allowedModelProviders: settings.allowedModelProviders,
      externalLlmPolicy: settings.externalLlmPolicy,
      maxContextSize: settings.maxContextSize,
      maxAgentExecutionDurationMs: settings.maxAgentExecutionDurationMs,
      maxWorkflowCost: settings.maxWorkflowCost,
      documentUploadLimitBytes: settings.documentUploadLimitBytes,
      retentionDays: settings.retentionDays,
      security: settings.security,
    }
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization settings' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ): Promise<OrganizationSettingsResponseDto> {
    await this.settingsRepo.updateSettings(user.organizationId, body)
    return this.getSettings(user)
  }

  // -------------------------------------------------------------------------
  // Users / Memberships
  // -------------------------------------------------------------------------

  @Get('users')
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<readonly MembershipResponseDto[]> {
    const memberships = await this.membershipRepo.findByOrganization(user.organizationId)
    return memberships.map((m) => ({
      membershipId: m.membershipId,
      userId: m.userId,
      organizationId: m.organizationId,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }))
  }

  @Post('users/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a user to the organization' })
  async inviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { email: string; name: string; role: string },
  ): Promise<MembershipResponseDto> {
    // Create the membership — actual user creation happens via auth flow
    const membership = await this.membershipRepo.create({
      userId: uuid(), // Placeholder until auth system creates the user
      organizationId: user.organizationId,
      role: body.role,
      invitedBy: user.id,
    })

    // Record audit event
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'USER_INVITED',
      action: `Invited ${body.email} as ${body.role}`,
      resourceType: 'USER',
      resourceId: membership.userId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: { email: body.email, role: body.role },
    })

    return {
      membershipId: membership.membershipId,
      userId: membership.userId,
      organizationId: membership.organizationId,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
    }
  }

  @Put('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a member role' })
  async changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() body: { role: string },
  ): Promise<{ updated: boolean }> {
    await this.membershipRepo.updateRole(membershipId, body.role)
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'ROLE_CHANGED',
      action: `Changed role to ${body.role}`,
      resourceType: 'MEMBERSHIP',
      resourceId: membershipId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: { newRole: body.role },
    })
    return { updated: true }
  }

  @Put('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a member' })
  async suspendMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
  ): Promise<{ suspended: boolean }> {
    await this.membershipRepo.updateStatus(membershipId, 'SUSPENDED')
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'USER_SUSPENDED',
      action: 'Suspended member',
      resourceType: 'MEMBERSHIP',
      resourceId: membershipId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: {},
    })
    return { suspended: true }
  }

  // -------------------------------------------------------------------------
  // Teams
  // -------------------------------------------------------------------------

  @Get('teams')
  @ApiOperation({ summary: 'List organization teams' })
  async listTeams(@CurrentUser() user: AuthenticatedUser): Promise<readonly TeamResponseDto[]> {
    const teams = await this.teamRepo.findByOrganization(user.organizationId)
    const result: TeamResponseDto[] = []
    for (const team of teams) {
      const members = await this.teamRepo.getMembers(team.teamId)
      result.push({
        teamId: team.teamId,
        name: team.name,
        description: team.description,
        status: team.status,
        memberCount: members.length,
        createdAt: team.createdAt,
      })
    }
    return result
  }

  @Post('teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team' })
  async createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; description: string },
  ): Promise<TeamResponseDto> {
    const team = await this.teamRepo.create({
      organizationId: user.organizationId,
      name: body.name,
      description: body.description,
    })
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'TEAM_CREATED',
      action: `Created team ${body.name}`,
      resourceType: 'TEAM',
      resourceId: team.teamId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: { name: body.name },
    })
    return {
      teamId: team.teamId,
      name: team.name,
      description: team.description,
      status: team.status,
      memberCount: 0,
      createdAt: team.createdAt,
    }
  }

  @Post('teams/:id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to team' })
  async addTeamMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') teamId: string,
    @Body() body: { userId: string; role?: string },
  ): Promise<{ added: boolean }> {
    await this.teamRepo.addMember(teamId, body.userId, body.role)
    return { added: true }
  }

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  @Get('roles')
  @ApiOperation({ summary: 'List organization roles' })
  async listRoles(@CurrentUser() user: AuthenticatedUser): Promise<readonly RoleResponseDto[]> {
    const roles = await this.roleRepo.findByOrganization(user.organizationId)
    const result: RoleResponseDto[] = []
    for (const role of roles) {
      const userCount = await this.roleRepo.countUsersWithRole(user.organizationId, role.name)
      result.push({
        roleId: role.roleId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isBuiltIn: role.isBuiltIn,
        status: role.status,
        userCount,
        createdAt: role.createdAt,
      })
    }
    return result
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; description: string; permissions: string[] },
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepo.create({
      organizationId: user.organizationId,
      name: body.name,
      description: body.description,
      permissions: body.permissions,
    })
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'ROLE_CHANGED',
      action: `Created role ${body.name}`,
      resourceType: 'ROLE',
      resourceId: role.roleId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: { name: body.name, permissionCount: body.permissions.length },
    })
    return {
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isBuiltIn: role.isBuiltIn,
      status: role.status,
      userCount: 0,
      createdAt: role.createdAt,
    }
  }

  // -------------------------------------------------------------------------
  // Policies
  // -------------------------------------------------------------------------

  @Get('policies')
  @ApiOperation({ summary: 'List governance policies' })
  async listPolicies(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
  ): Promise<readonly PolicyResponseDto[]> {
    const policies = await this.policyRepo.findByOrganization(user.organizationId, type as never)
    return policies.map((p) => ({
      policyId: p.policyId,
      name: p.name,
      description: p.description,
      type: p.type,
      version: p.version,
      status: p.status,
      configuration: p.configuration,
      createdAt: p.createdAt,
    }))
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a policy' })
  async createPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string
      description: string
      type: string
      configuration: Record<string, unknown>
    },
  ): Promise<PolicyResponseDto> {
    const policy = await this.policyRepo.create({
      organizationId: user.organizationId,
      name: body.name,
      description: body.description,
      type: body.type as never,
      configuration: body.configuration,
      createdBy: user.id,
    })
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'POLICY_CREATED',
      action: `Created policy ${body.name} (${body.type})`,
      resourceType: 'POLICY',
      resourceId: policy.policyId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: { name: body.name, type: body.type },
    })
    return {
      policyId: policy.policyId,
      name: policy.name,
      description: policy.description,
      type: policy.type,
      version: policy.version,
      status: policy.status,
      configuration: policy.configuration,
      createdAt: policy.createdAt,
    }
  }

  @Post('policies/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a policy (makes it active)' })
  async publishPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') policyId: string,
  ): Promise<{ published: boolean }> {
    await this.policyRepo.updateStatus(policyId, 'ACTIVE')
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'POLICY_PUBLISHED',
      action: 'Published policy',
      resourceType: 'POLICY',
      resourceId: policyId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: {},
    })
    return { published: true }
  }

  // -------------------------------------------------------------------------
  // Agent Governance
  // -------------------------------------------------------------------------

  @Get('agents')
  @ApiOperation({ summary: 'List agent definitions' })
  async listAgents(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<readonly AgentDefinitionResponseDto[]> {
    const agents = await this.agentRepo.findByOrganization(user.organizationId)
    return agents.map((a) => ({
      agentId: a.agentId,
      name: a.name,
      description: a.description,
      version: a.version,
      status: a.status,
      capabilities: a.capabilities,
      allowedTools: a.allowedTools,
      modelProvider: a.modelProvider,
      modelName: a.modelName,
      maxIterations: a.maxIterations,
      maxToolCalls: a.maxToolCalls,
      maxTokens: a.maxTokens,
      maxCost: a.maxCost,
      createdAt: a.createdAt,
    }))
  }

  @Post('agents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create agent definition' })
  async createAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ): Promise<AgentDefinitionResponseDto> {
    const agent = await this.agentRepo.create({
      organizationId: user.organizationId,
      name: body.name as string,
      description: (body.description as string) ?? '',
      capabilities: (body.capabilities as string[]) ?? [],
      allowedTools: (body.allowedTools as string[]) ?? [],
      modelProvider: (body.modelProvider as string) ?? null,
      modelName: (body.modelName as string) ?? null,
      maxIterations: (body.maxIterations as number) ?? 5,
      maxToolCalls: (body.maxToolCalls as number) ?? 10,
      maxTokens: (body.maxTokens as number) ?? 15000,
      maxCost: (body.maxCost as number) ?? 1.0,
      maxExecutionDurationMs: (body.maxExecutionDurationMs as number) ?? 300000,
      policyReferences: (body.policyReferences as string[]) ?? [],
      createdBy: user.id,
    })
    return {
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      version: agent.version,
      status: agent.status,
      capabilities: agent.capabilities,
      allowedTools: agent.allowedTools,
      modelProvider: agent.modelProvider,
      modelName: agent.modelName,
      maxIterations: agent.maxIterations,
      maxToolCalls: agent.maxToolCalls,
      maxTokens: agent.maxTokens,
      maxCost: agent.maxCost,
      createdAt: agent.createdAt,
    }
  }

  @Post('agents/:id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable an agent definition' })
  async enableAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') agentId: string,
  ): Promise<{ enabled: boolean }> {
    await this.agentRepo.updateStatus(agentId, 'ACTIVE')
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'AGENT_ENABLED',
      action: 'Enabled agent',
      resourceType: 'AGENT',
      resourceId: agentId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: {},
    })
    return { enabled: true }
  }

  @Post('agents/:id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable an agent definition' })
  async disableAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') agentId: string,
  ): Promise<{ disabled: boolean }> {
    await this.agentRepo.updateStatus(agentId, 'DISABLED')
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'AGENT_DISABLED',
      action: 'Disabled agent',
      resourceType: 'AGENT',
      resourceId: agentId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: {},
    })
    return { disabled: true }
  }

  // -------------------------------------------------------------------------
  // Model Governance
  // -------------------------------------------------------------------------

  @Get('models')
  @ApiOperation({ summary: 'List model provider configurations' })
  async listModels(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<readonly ModelProviderResponseDto[]> {
    const configs = await this.modelRepo.findByOrganization(user.organizationId)
    return configs.map((c) => ({
      configId: c.configId,
      provider: c.provider,
      status: c.status,
      allowedModels: c.allowedModels,
      blockedModels: c.blockedModels,
      defaultModel: c.defaultModel,
      fallbackModel: c.fallbackModel,
      maxTokensPerRequest: c.maxTokensPerRequest,
      createdAt: c.createdAt,
    }))
  }

  @Post('models')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Configure a model provider' })
  async configureModel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ): Promise<ModelProviderResponseDto> {
    const config = await this.modelRepo.create({
      organizationId: user.organizationId,
      provider: body.provider as string,
      status: 'ACTIVE',
      allowedModels: (body.allowedModels as string[]) ?? [],
      blockedModels: (body.blockedModels as string[]) ?? [],
      defaultModel: (body.defaultModel as string) ?? null,
      fallbackModel: (body.fallbackModel as string) ?? null,
      maxTokensPerRequest: (body.maxTokensPerRequest as number) ?? 128000,
      costPerInputToken: (body.costPerInputToken as number) ?? 0,
      costPerOutputToken: (body.costPerOutputToken as number) ?? 0,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
    })
    return {
      configId: config.configId,
      provider: config.provider,
      status: config.status,
      allowedModels: config.allowedModels,
      blockedModels: config.blockedModels,
      defaultModel: config.defaultModel,
      fallbackModel: config.fallbackModel,
      maxTokensPerRequest: config.maxTokensPerRequest,
      createdAt: config.createdAt,
    }
  }

  // -------------------------------------------------------------------------
  // Budgets
  // -------------------------------------------------------------------------

  @Get('budgets')
  @ApiOperation({ summary: 'List budgets' })
  async listBudgets(@CurrentUser() user: AuthenticatedUser): Promise<readonly BudgetResponseDto[]> {
    const budgets = await this.budgetRepo.findByOrganization(user.organizationId)
    return budgets.map((b) => ({
      budgetId: b.budgetId,
      type: b.type,
      targetType: b.targetType,
      targetId: b.targetId,
      limit: b.limit,
      period: b.period,
      currentUsage: b.currentUsage,
      status: b.status,
      usagePercentage: b.limit > 0 ? Math.round((b.currentUsage / b.limit) * 10000) / 100 : 0,
      createdAt: b.createdAt,
    }))
  }

  @Post('budgets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a budget' })
  async createBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      type: string
      limit: number
      period: string
      targetType?: string
      targetId?: string
      warningThreshold?: number
    },
  ): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepo.create({
      organizationId: user.organizationId,
      type: body.type as never,
      targetType: body.targetType ?? null,
      targetId: body.targetId ?? null,
      limit: body.limit,
      period: body.period as never,
      warningThreshold: body.warningThreshold ?? 0.8,
    })
    return {
      budgetId: budget.budgetId,
      type: budget.type,
      targetType: budget.targetType,
      targetId: budget.targetId,
      limit: budget.limit,
      period: budget.period,
      currentUsage: budget.currentUsage,
      status: budget.status,
      usagePercentage: 0,
      createdAt: budget.createdAt,
    }
  }

  // -------------------------------------------------------------------------
  // Usage
  // -------------------------------------------------------------------------

  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary' })
  async getUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<UsageResponseDto> {
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const fromDate = from ?? defaultFrom
    const toDate = to ?? now.toISOString()

    const [totals, daily] = await Promise.all([
      this.usageRepo.getTotals(user.organizationId, fromDate, toDate),
      this.usageRepo.getDailyBreakdown(user.organizationId, fromDate, toDate),
    ])

    return {
      totalInputTokens: totals.totalInputTokens,
      totalOutputTokens: totals.totalOutputTokens,
      totalToolCalls: totals.totalToolCalls,
      totalCost: totals.totalCost,
      recordCount: totals.recordCount,
      dailyBreakdown: daily.map((d) => ({
        date: d.date,
        cost: d.cost,
        tokens: d.inputTokens + d.outputTokens,
      })),
    }
  }

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  @Get('audit')
  @ApiOperation({ summary: 'Get audit events' })
  async getAuditEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('eventType') eventType?: string,
    @Query('resourceType') resourceType?: string,
    @Query('outcome') outcome?: string,
    @Query('limit') limit?: string,
  ): Promise<readonly AuditEventResponseDto[]> {
    const events = await this.auditRepo.findByOrganization(user.organizationId, {
      eventType: eventType as never,
      resourceType,
      outcome: outcome as never,
      limit: limit ? parseInt(limit) : 50,
    })
    return events.map((e) => ({
      eventId: e.eventId,
      eventType: e.eventType,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      outcome: e.outcome,
      actorId: e.actorId,
      actorType: e.actorType,
      timestamp: e.timestamp,
      metadata: e.metadata,
    }))
  }

  @Get('audit/verify')
  @ApiOperation({ summary: 'Verify audit chain integrity' })
  async verifyAuditChain(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<AuditChainResponseDto> {
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    return this.auditRepo.verifyChain(
      user.organizationId,
      from ?? defaultFrom,
      to ?? now.toISOString(),
    )
  }

  // -------------------------------------------------------------------------
  // Policy Simulation
  // -------------------------------------------------------------------------

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate policy evaluation (read-only, no state changes)' })
  async simulatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      userId: string
      resourceType: string
      resourceId?: string
      action: string
      policyIds: string[]
      contextOverrides?: Record<string, unknown>
    },
  ): Promise<PolicySimulationResponseDto> {
    return this.simulationService.simulate({
      userId: body.userId,
      resourceType: body.resourceType,
      resourceId: body.resourceId ?? null,
      action: body.action,
      policyIds: body.policyIds,
      contextOverrides: body.contextOverrides,
    })
  }

  // -------------------------------------------------------------------------
  // Break-Glass Access
  // -------------------------------------------------------------------------

  @Post('break-glass')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grant emergency break-glass access' })
  async grantBreakGlass(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { userId: string; permissions: string[]; reason: string; durationMinutes: number },
  ): Promise<BreakGlassResponseDto> {
    const expiresAt = new Date(Date.now() + body.durationMinutes * 60 * 1000).toISOString()
    const access = await this.breakGlassRepo.create({
      organizationId: user.organizationId,
      userId: body.userId,
      permissions: body.permissions,
      reason: body.reason,
      grantedBy: user.id,
      expiresAt,
    })
    await this.auditRepo.record({
      organizationId: user.organizationId,
      actorId: user.id,
      actorType: 'USER',
      eventType: 'BREAK_GLASS_USED',
      action: `Granted break-glass access: ${body.reason}`,
      resourceType: 'BREAK_GLASS',
      resourceId: access.accessId,
      outcome: 'SUCCESS',
      requestId: null,
      metadata: {
        userId: body.userId,
        permissions: body.permissions,
        durationMinutes: body.durationMinutes,
      },
    })
    return {
      accessId: access.accessId,
      userId: access.userId,
      permissions: access.permissions,
      reason: access.reason,
      status: access.status,
      expiresAt: access.expiresAt,
    }
  }
}
