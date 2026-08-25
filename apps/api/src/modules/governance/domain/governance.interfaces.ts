/* Governance domain interfaces — abstract DI tokens for the GovernanceModule.

Separation of authorities:
  GOVERNANCE MODULE  → configuration, administration, policy management, audit, usage
  PERMISSION ENGINE  → authorization decisions
  RULE ENGINE        → deterministic policy evaluation
  MODEL GATEWAY      → model communication
  AGENT RUNTIME      → agent execution
  WORKFLOW ENGINE    → workflow execution
*/

import type {
  EntityId,
  Metadata,
  Timestamp,
  OrganizationSettings,
  UserMembership,
  MembershipStatus,
  Team,
  TeamMembership,
  CustomRole,
  Policy,
  PolicyType,
  PolicyStatus,
  AgentDefinition,
  AgentDefinitionStatus,
  ModelProviderConfiguration,
  ModelProviderStatus,
  Budget,
  BudgetType,
  BudgetPeriod,
  BudgetStatus,
  UsageRecord,
  GovernanceAuditEvent,
  AuditEventType,
  AuditOutcome,
  BreakGlassAccess,
  PolicySimulationRequest,
  PolicySimulationResult,
  GovernanceOverview,
} from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Organization Settings Repository
// ---------------------------------------------------------------------------

export abstract class IOrganizationSettingsRepository {
  abstract getSettings(organizationId: EntityId): Promise<OrganizationSettings>
  abstract updateSettings(
    organizationId: EntityId,
    settings: Partial<OrganizationSettings>,
  ): Promise<OrganizationSettings>
}

// ---------------------------------------------------------------------------
// Membership Repository
// ---------------------------------------------------------------------------

export abstract class IMembershipRepository {
  abstract create(data: MembershipCreateData): Promise<UserMembership>
  abstract findById(membershipId: EntityId): Promise<UserMembership | null>
  abstract findByUser(userId: EntityId): Promise<readonly UserMembership[]>
  abstract findByOrganization(organizationId: EntityId): Promise<readonly UserMembership[]>
  abstract findByUserAndOrganization(
    userId: EntityId,
    organizationId: EntityId,
  ): Promise<UserMembership | null>
  abstract updateStatus(membershipId: EntityId, status: MembershipStatus): Promise<void>
  abstract updateRole(membershipId: EntityId, role: string): Promise<void>
  abstract remove(membershipId: EntityId): Promise<void>
  abstract countByOrganization(organizationId: EntityId): Promise<number>
}

export interface MembershipCreateData {
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly role: string
  readonly invitedBy: EntityId | null
}

// ---------------------------------------------------------------------------
// Team Repository
// ---------------------------------------------------------------------------

export abstract class ITeamRepository {
  abstract create(data: TeamCreateData): Promise<Team>
  abstract findById(teamId: EntityId): Promise<Team | null>
  abstract findByOrganization(organizationId: EntityId): Promise<readonly Team[]>
  abstract update(teamId: EntityId, data: Partial<TeamCreateData>): Promise<Team>
  abstract delete(teamId: EntityId): Promise<void>
  abstract addMember(teamId: EntityId, userId: EntityId, role?: string): Promise<TeamMembership>
  abstract removeMember(teamId: EntityId, userId: EntityId): Promise<void>
  abstract getMembers(teamId: EntityId): Promise<readonly TeamMembership[]>
  abstract getUserTeams(userId: EntityId, organizationId: EntityId): Promise<readonly Team[]>
}

export interface TeamCreateData {
  readonly organizationId: EntityId
  readonly name: string
  readonly description: string
}

// ---------------------------------------------------------------------------
// Role Repository
// ---------------------------------------------------------------------------

export abstract class IRoleRepository {
  abstract create(data: RoleCreateData): Promise<CustomRole>
  abstract findById(roleId: EntityId): Promise<CustomRole | null>
  abstract findByOrganization(organizationId: EntityId): Promise<readonly CustomRole[]>
  abstract findByName(organizationId: EntityId, name: string): Promise<CustomRole | null>
  abstract update(roleId: EntityId, data: Partial<RoleCreateData>): Promise<CustomRole>
  abstract delete(roleId: EntityId): Promise<void>
  abstract countUsersWithRole(organizationId: EntityId, roleName: string): Promise<number>
}

export interface RoleCreateData {
  readonly organizationId: EntityId
  readonly name: string
  readonly description: string
  readonly permissions: readonly string[]
}

// ---------------------------------------------------------------------------
// Policy Repository
// ---------------------------------------------------------------------------

export abstract class IPolicyRepository {
  abstract create(data: PolicyCreateData): Promise<Policy>
  abstract findById(policyId: EntityId): Promise<Policy | null>
  abstract findByOrganization(
    organizationId: EntityId,
    type?: PolicyType,
  ): Promise<readonly Policy[]>
  abstract findByNameAndVersion(
    organizationId: EntityId,
    name: string,
    version: number,
  ): Promise<Policy | null>
  abstract findActivePolicies(
    organizationId: EntityId,
    type?: PolicyType,
  ): Promise<readonly Policy[]>
  abstract updateStatus(policyId: EntityId, status: PolicyStatus): Promise<void>
  abstract incrementVersion(organizationId: EntityId, name: string): Promise<number>
  abstract delete(policyId: EntityId): Promise<void>
}

export interface PolicyCreateData {
  readonly organizationId: EntityId
  readonly name: string
  readonly description: string
  readonly type: PolicyType
  readonly configuration: Metadata
  readonly createdBy: EntityId
}

// ---------------------------------------------------------------------------
// Agent Governance Repository
// ---------------------------------------------------------------------------

export abstract class IAgentGovernanceRepository {
  abstract create(data: AgentDefinitionCreateData): Promise<AgentDefinition>
  abstract findById(agentId: EntityId): Promise<AgentDefinition | null>
  abstract findByOrganization(
    organizationId: EntityId,
    status?: AgentDefinitionStatus,
  ): Promise<readonly AgentDefinition[]>
  abstract findByNameAndVersion(
    organizationId: EntityId,
    name: string,
    version: number,
  ): Promise<AgentDefinition | null>
  abstract updateStatus(agentId: EntityId, status: AgentDefinitionStatus): Promise<void>
  abstract incrementVersion(organizationId: EntityId, name: string): Promise<number>
  abstract delete(agentId: EntityId): Promise<void>
}

export interface AgentDefinitionCreateData {
  readonly organizationId: EntityId
  readonly name: string
  readonly description: string
  readonly capabilities: readonly string[]
  readonly allowedTools: readonly string[]
  readonly modelProvider: string | null
  readonly modelName: string | null
  readonly maxIterations: number
  readonly maxToolCalls: number
  readonly maxTokens: number
  readonly maxCost: number
  readonly maxExecutionDurationMs: number
  readonly policyReferences: readonly EntityId[]
  readonly createdBy: EntityId
}

// ---------------------------------------------------------------------------
// Model Governance Repository
// ---------------------------------------------------------------------------

export abstract class IModelGovernanceRepository {
  abstract create(data: ModelConfigCreateData): Promise<ModelProviderConfiguration>
  abstract findById(configId: EntityId): Promise<ModelProviderConfiguration | null>
  abstract findByOrganization(
    organizationId: EntityId,
  ): Promise<readonly ModelProviderConfiguration[]>
  abstract findByProvider(
    organizationId: EntityId,
    provider: string,
  ): Promise<ModelProviderConfiguration | null>
  abstract update(
    configId: EntityId,
    data: Partial<ModelConfigCreateData>,
  ): Promise<ModelProviderConfiguration>
  abstract delete(configId: EntityId): Promise<void>
  abstract isModelAllowed(
    organizationId: EntityId,
    provider: string,
    model: string,
  ): Promise<boolean>
}

export interface ModelConfigCreateData {
  readonly organizationId: EntityId
  readonly provider: string
  readonly status: ModelProviderStatus
  readonly allowedModels: readonly string[]
  readonly blockedModels: readonly string[]
  readonly defaultModel: string | null
  readonly fallbackModel: string | null
  readonly maxTokensPerRequest: number
  readonly costPerInputToken: number
  readonly costPerOutputToken: number
  readonly metadata: Metadata
}

// ---------------------------------------------------------------------------
// Budget Repository
// ---------------------------------------------------------------------------

export abstract class IBudgetRepository {
  abstract create(data: BudgetCreateData): Promise<Budget>
  abstract findById(budgetId: EntityId): Promise<Budget | null>
  abstract findByOrganization(
    organizationId: EntityId,
    type?: BudgetType,
  ): Promise<readonly Budget[]>
  abstract findByTarget(
    organizationId: EntityId,
    type: BudgetType,
    targetId: EntityId | null,
  ): Promise<Budget | null>
  abstract updateUsage(budgetId: EntityId, amount: number): Promise<Budget>
  abstract updateStatus(budgetId: EntityId, status: BudgetStatus): Promise<void>
  abstract delete(budgetId: EntityId): Promise<void>
}

export interface BudgetCreateData {
  readonly organizationId: EntityId
  readonly type: BudgetType
  readonly targetType: string | null
  readonly targetId: EntityId | null
  readonly limit: number
  readonly period: BudgetPeriod
  readonly warningThreshold: number
}

// ---------------------------------------------------------------------------
// Usage Repository
// ---------------------------------------------------------------------------

export abstract class IUsageRepository {
  abstract record(data: UsageRecordCreateData): Promise<UsageRecord>
  abstract findByOrganization(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly UsageRecord[]>
  abstract findByUser(
    userId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly UsageRecord[]>
  abstract getTotals(organizationId: EntityId, from: Timestamp, to: Timestamp): Promise<UsageTotals>
  abstract getDailyBreakdown(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<readonly DailyUsage[]>
}

export interface UsageRecordCreateData {
  readonly organizationId: EntityId
  readonly userId: EntityId
  readonly agentId: EntityId | null
  readonly workflowId: EntityId | null
  readonly modelProvider: string
  readonly modelName: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly toolCalls: number
  readonly retrievalCalls: number
  readonly embeddingsCount: number
  readonly storageBytes: number
  readonly durationMs: number
  readonly estimatedCost: number
}

export interface UsageTotals {
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly totalToolCalls: number
  readonly totalRetrievalCalls: number
  readonly totalCost: number
  readonly recordCount: number
}

export interface DailyUsage {
  readonly date: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cost: number
}

// ---------------------------------------------------------------------------
// Audit Repository
// ---------------------------------------------------------------------------

export abstract class IAuditRepository {
  abstract record(data: AuditEventCreateData): Promise<GovernanceAuditEvent>
  abstract findById(eventId: EntityId): Promise<GovernanceAuditEvent | null>
  abstract findByOrganization(
    organizationId: EntityId,
    filters?: AuditFilters,
  ): Promise<readonly GovernanceAuditEvent[]>
  abstract getLatestHash(organizationId: EntityId): Promise<string | null>
  abstract verifyChain(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<AuditChainVerification>
  abstract countByOrganization(
    organizationId: EntityId,
    from?: Timestamp,
    to?: Timestamp,
  ): Promise<number>
}

export interface AuditEventCreateData {
  readonly organizationId: EntityId
  readonly actorId: EntityId
  readonly actorType: string
  readonly eventType: AuditEventType
  readonly action: string
  readonly resourceType: string
  readonly resourceId: EntityId | null
  readonly outcome: AuditOutcome
  readonly requestId: string | null
  readonly metadata: Metadata
}

export interface AuditFilters {
  readonly actorId?: EntityId
  readonly eventType?: AuditEventType
  readonly resourceType?: string
  readonly outcome?: AuditOutcome
  readonly from?: Timestamp
  readonly to?: Timestamp
  readonly limit?: number
  readonly offset?: number
}

export interface AuditChainVerification {
  readonly valid: boolean
  readonly totalEvents: number
  readonly brokenAt: EntityId | null
  readonly message: string
}

// ---------------------------------------------------------------------------
// Break-Glass Repository
// ---------------------------------------------------------------------------

export abstract class IBreakGlassRepository {
  abstract create(data: BreakGlassCreateData): Promise<BreakGlassAccess>
  abstract findActiveByUser(
    userId: EntityId,
    organizationId: EntityId,
  ): Promise<BreakGlassAccess | null>
  abstract revoke(accessId: EntityId): Promise<void>
  abstract cleanupExpired(): Promise<number>
}

export interface BreakGlassCreateData {
  readonly organizationId: EntityId
  readonly userId: EntityId
  readonly permissions: readonly string[]
  readonly reason: string
  readonly grantedBy: EntityId
  readonly expiresAt: Timestamp
}

// ---------------------------------------------------------------------------
// Policy Simulation Service
// ---------------------------------------------------------------------------

export abstract class IPolicySimulationService {
  abstract simulate(request: PolicySimulationRequest): Promise<PolicySimulationResult>
}

// ---------------------------------------------------------------------------
// Governance Analytics Service
// ---------------------------------------------------------------------------

export abstract class IGovernanceAnalyticsService {
  abstract getOverview(organizationId: EntityId): Promise<GovernanceOverview>
}

// ---------------------------------------------------------------------------
// Budget Enforcement Service
// ---------------------------------------------------------------------------

export abstract class IBudgetEnforcementService {
  abstract checkBudget(
    organizationId: EntityId,
    type: BudgetType,
    targetId: EntityId | null,
    estimatedCost: number,
  ): Promise<BudgetCheckResult>
  abstract recordUsage(
    organizationId: EntityId,
    userId: EntityId,
    cost: number,
    metadata: Metadata,
  ): Promise<void>
}

export interface BudgetCheckResult {
  readonly allowed: boolean
  readonly reason: string | null
  readonly currentUsage: number
  readonly limit: number
  readonly remaining: number
  readonly status: BudgetStatus
}
