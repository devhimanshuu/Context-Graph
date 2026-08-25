/* Governance API DTOs — request and response shapes. */

// ---------------------------------------------------------------------------
// Membership DTOs
// ---------------------------------------------------------------------------

export interface InviteUserRequestDto {
  readonly email: string
  readonly name: string
  readonly role: string
}

export interface MembershipResponseDto {
  readonly membershipId: string
  readonly userId: string
  readonly organizationId: string
  readonly role: string
  readonly status: string
  readonly joinedAt: string
}

// ---------------------------------------------------------------------------
// Team DTOs
// ---------------------------------------------------------------------------

export interface CreateTeamRequestDto {
  readonly name: string
  readonly description: string
}

export interface TeamResponseDto {
  readonly teamId: string
  readonly name: string
  readonly description: string
  readonly status: string
  readonly memberCount: number
  readonly createdAt: string
}

export interface AddTeamMemberRequestDto {
  readonly userId: string
  readonly role?: string
}

// ---------------------------------------------------------------------------
// Role DTOs
// ---------------------------------------------------------------------------

export interface CreateRoleRequestDto {
  readonly name: string
  readonly description: string
  readonly permissions: readonly string[]
}

export interface RoleResponseDto {
  readonly roleId: string
  readonly name: string
  readonly description: string
  readonly permissions: readonly string[]
  readonly isBuiltIn: boolean
  readonly status: string
  readonly userCount: number
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Policy DTOs
// ---------------------------------------------------------------------------

export interface CreatePolicyRequestDto {
  readonly name: string
  readonly description: string
  readonly type: string
  readonly configuration: Record<string, unknown>
}

export interface PolicyResponseDto {
  readonly policyId: string
  readonly name: string
  readonly description: string
  readonly type: string
  readonly version: number
  readonly status: string
  readonly configuration: Record<string, unknown>
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Agent Governance DTOs
// ---------------------------------------------------------------------------

export interface CreateAgentDefinitionRequestDto {
  readonly name: string
  readonly description: string
  readonly capabilities: readonly string[]
  readonly allowedTools: readonly string[]
  readonly modelProvider?: string
  readonly modelName?: string
  readonly maxIterations?: number
  readonly maxToolCalls?: number
  readonly maxTokens?: number
  readonly maxCost?: number
  readonly maxExecutionDurationMs?: number
}

export interface AgentDefinitionResponseDto {
  readonly agentId: string
  readonly name: string
  readonly description: string
  readonly version: number
  readonly status: string
  readonly capabilities: readonly string[]
  readonly allowedTools: readonly string[]
  readonly modelProvider: string | null
  readonly modelName: string | null
  readonly maxIterations: number
  readonly maxToolCalls: number
  readonly maxTokens: number
  readonly maxCost: number
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Model Governance DTOs
// ---------------------------------------------------------------------------

export interface ConfigureModelProviderRequestDto {
  readonly provider: string
  readonly allowedModels: readonly string[]
  readonly blockedModels: readonly string[]
  readonly defaultModel?: string
  readonly fallbackModel?: string
  readonly maxTokensPerRequest?: number
  readonly costPerInputToken?: number
  readonly costPerOutputToken?: number
}

export interface ModelProviderResponseDto {
  readonly configId: string
  readonly provider: string
  readonly status: string
  readonly allowedModels: readonly string[]
  readonly blockedModels: readonly string[]
  readonly defaultModel: string | null
  readonly fallbackModel: string | null
  readonly maxTokensPerRequest: number
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Budget DTOs
// ---------------------------------------------------------------------------

export interface CreateBudgetRequestDto {
  readonly type: string
  readonly targetType?: string
  readonly targetId?: string
  readonly limit: number
  readonly period: string
  readonly warningThreshold?: number
}

export interface BudgetResponseDto {
  readonly budgetId: string
  readonly type: string
  readonly targetType: string | null
  readonly targetId: string | null
  readonly limit: number
  readonly period: string
  readonly currentUsage: number
  readonly status: string
  readonly usagePercentage: number
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Usage DTOs
// ---------------------------------------------------------------------------

export interface UsageResponseDto {
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly totalToolCalls: number
  readonly totalCost: number
  readonly recordCount: number
  readonly dailyBreakdown: readonly { date: string; cost: number; tokens: number }[]
}

// ---------------------------------------------------------------------------
// Audit DTOs
// ---------------------------------------------------------------------------

export interface AuditEventResponseDto {
  readonly eventId: string
  readonly eventType: string
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string | null
  readonly outcome: string
  readonly actorId: string
  readonly actorType: string
  readonly timestamp: string
  readonly metadata: Record<string, unknown>
}

export interface AuditChainResponseDto {
  readonly valid: boolean
  readonly totalEvents: number
  readonly brokenAt: string | null
  readonly message: string
}

// ---------------------------------------------------------------------------
// Policy Simulation DTOs
// ---------------------------------------------------------------------------

export interface PolicySimulationRequestDto {
  readonly userId: string
  readonly resourceType: string
  readonly resourceId?: string
  readonly action: string
  readonly policyIds: readonly string[]
  readonly contextOverrides?: Record<string, unknown>
}

export interface PolicySimulationResponseDto {
  readonly allowed: boolean
  readonly reason: string
  readonly matchedPolicies: readonly string[]
  readonly deniedPolicies: readonly string[]
  readonly evaluatedAt: string
}

// ---------------------------------------------------------------------------
// Break-Glass DTOs
// ---------------------------------------------------------------------------

export interface BreakGlassRequestDto {
  readonly userId: string
  readonly permissions: readonly string[]
  readonly reason: string
  readonly durationMinutes: number
}

export interface BreakGlassResponseDto {
  readonly accessId: string
  readonly userId: string
  readonly permissions: readonly string[]
  readonly reason: string
  readonly status: string
  readonly expiresAt: string
}

// ---------------------------------------------------------------------------
// Governance Overview DTO
// ---------------------------------------------------------------------------

export interface GovernanceOverviewResponseDto {
  readonly totalUsers: number
  readonly activeUsers: number
  readonly activeAgents: number
  readonly activeWorkflows: number
  readonly activePolicies: number
  readonly securityEvents: number
  readonly monthlyCost: number
  readonly budgetUsage: number
  readonly failedExecutions: number
  readonly authorizationDenials: number
}

// ---------------------------------------------------------------------------
// Organization Settings DTOs
// ---------------------------------------------------------------------------

export interface OrganizationSettingsResponseDto {
  readonly defaultModel: string | null
  readonly allowedModelProviders: readonly string[]
  readonly externalLlmPolicy: string
  readonly maxContextSize: number
  readonly maxAgentExecutionDurationMs: number
  readonly maxWorkflowCost: number
  readonly documentUploadLimitBytes: number
  readonly retentionDays: number | null
  readonly security: {
    readonly requireMfa: boolean
    readonly sessionTimeoutMinutes: number
    readonly ipAllowlist: readonly string[]
    readonly breakGlassEnabled: boolean
  }
}

export interface UpdateOrganizationSettingsRequestDto {
  readonly defaultModel?: string
  readonly allowedModelProviders?: readonly string[]
  readonly externalLlmPolicy?: string
  readonly maxContextSize?: number
  readonly maxAgentExecutionDurationMs?: number
  readonly maxWorkflowCost?: number
  readonly documentUploadLimitBytes?: number
  readonly retentionDays?: number | null
  readonly security?: Partial<OrganizationSettingsResponseDto['security']>
}
