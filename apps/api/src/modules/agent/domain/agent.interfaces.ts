/* Agent domain interfaces — every dependency is an abstract class bound in the module. */

import type { EntityId, Metadata, Milliseconds, Timestamp } from '@contextgraph/types'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { AgentExecutionStatus } from '@contextgraph/types'
import type { AgentPlan, AgentLimits, AgentModelConfiguration, ToolSchema } from './agent.types'

// ---------------------------------------------------------------------------
// Agent Runtime (orchestrator)
// ---------------------------------------------------------------------------

export abstract class IAgentRuntime {
  /**
   * Execute an agent request synchronously.
   * Returns the complete execution result.
   */
  abstract execute(input: AgentExecutionInput): Promise<AgentExecutionResult>

  /**
   * Get the current state of a running execution.
   */
  abstract getState(executionId: string): Promise<AgentExecutionStateSnapshot | null>
}

export interface AgentExecutionInput {
  readonly userRequest: string
  readonly user: AuthenticatedUser
  readonly workspaceId: EntityId
  readonly entryContext?: Record<string, unknown>
  readonly modelConfig?: Partial<AgentModelConfiguration>
}

export interface AgentExecutionResult {
  readonly executionId: EntityId
  readonly status: AgentExecutionStatus
  readonly finalResponse: string | null
  readonly iterations: number
  readonly toolCalls: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
  readonly durationMs: Milliseconds
  readonly trace: readonly TraceEntry[]
  readonly error: string | null
}

export interface AgentExecutionStateSnapshot {
  readonly executionId: EntityId
  readonly status: AgentExecutionStatus
  readonly currentStepIndex: number
  readonly iterationCount: number
  readonly toolCallCount: number
}

// ---------------------------------------------------------------------------
// Trace (safe summaries — never chain-of-thought)
// ---------------------------------------------------------------------------

export interface TraceEntry {
  readonly timestamp: Timestamp
  readonly eventType: string
  readonly summary: string
  readonly stepIndex: number | null
  readonly metadata: Metadata
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export abstract class IAgentPlanner {
  /**
   * Create an execution plan from a user request.
   * The planner does NOT determine authorization.
   */
  abstract createPlan(
    userRequest: string,
    availableTools: readonly { readonly name: string; readonly description: string }[],
    limits: AgentLimits,
    state: PlannerStateInput,
  ): Promise<AgentPlan>

  /**
   * Update the plan based on observations from the previous step.
   */
  abstract updatePlan(
    currentPlan: AgentPlan,
    observations: readonly ObservationInput[],
    limits: AgentLimits,
  ): Promise<AgentPlan>
}

export interface PlannerStateInput {
  readonly iteration: number
  readonly completedSteps: readonly string[]
  readonly observations: readonly ObservationInput[]
}

export interface ObservationInput {
  readonly toolName: string
  readonly summary: string
  readonly data: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Agent State Manager
// ---------------------------------------------------------------------------

export abstract class IAgentStateManager {
  abstract create(input: CreateStateInput): Promise<AgentStateData>
  abstract transition(executionId: string, newStatus: AgentExecutionStatus): Promise<void>
  abstract updateStep(executionId: string, stepIndex: number, updates: StepUpdates): Promise<void>
  abstract addObservation(executionId: string, observation: ObservationData): Promise<void>
  abstract addToolCall(executionId: string, toolCall: ToolCallData): Promise<void>
  abstract addVerification(executionId: string, verification: VerificationData): Promise<void>
  abstract get(executionId: string): Promise<AgentStateData | null>
  abstract finalize(executionId: string, result: FinalizationInput): Promise<void>
}

export interface CreateStateInput {
  readonly executionId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userRequest: string
  readonly config: AgentLimits
}

export interface StepUpdates {
  readonly status?: string
  readonly output?: Metadata
  readonly errorMessage?: string
  readonly durationMs?: Milliseconds
}

export interface ObservationData {
  readonly toolName: string
  readonly summary: string
  readonly data: Record<string, unknown>
}

export interface ToolCallData {
  readonly toolName: string
  readonly input: Record<string, unknown>
  readonly output: Record<string, unknown> | null
  readonly status: string
  readonly policyDecision: string | null
  readonly durationMs: Milliseconds
  readonly failureReason: string | null
}

export interface VerificationData {
  readonly checkType: string
  readonly status: string
  readonly details: Record<string, unknown>
}

export interface FinalizationInput {
  readonly status: AgentExecutionStatus
  readonly finalResponse?: string
  readonly errorMessage?: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
}

export interface AgentStateData {
  readonly executionId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userRequest: string
  readonly status: AgentExecutionStatus
  readonly currentStepIndex: number
  readonly iterationCount: number
  readonly toolCallCount: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
  readonly finalResponse: string | null
  readonly errorMessage: string | null
  readonly observations: ObservationData[]
  readonly config: AgentLimits
}

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

export abstract class IToolRegistry {
  abstract register(tool: ToolRegistration): void
  abstract get(name: string): ToolRegistration | undefined
  abstract has(name: string): boolean
  abstract list(): readonly ToolRegistration[]
  abstract getSchemas(): readonly ToolSchema[]
  abstract validateToolName(name: string): boolean
}

export interface ToolRegistration {
  readonly schema: ToolSchema
  readonly execute: (
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>
}

export interface ToolExecutionContext {
  readonly executionId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
}

export interface ToolExecutionResult {
  readonly success: boolean
  readonly data: Record<string, unknown> | null
  readonly summary: string
  readonly error: string | null
  readonly durationMs: Milliseconds
}

// ---------------------------------------------------------------------------
// Tool Authorizer
// ---------------------------------------------------------------------------

export abstract class IToolAuthorizer {
  /**
   * Check if the user is authorized to execute a tool with the given input.
   * Returns the authorization decision.
   */
  abstract authorize(
    tool: ToolSchema,
    context: ToolExecutionContext,
    input: Record<string, unknown>,
  ): Promise<ToolAuthorizationDecision>
}

export interface ToolAuthorizationDecision {
  readonly allowed: boolean
  readonly reason: string | null
  readonly policyId: string | null
}

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

export abstract class IToolExecutor {
  /**
   * Execute a tool through the full validation → authorization → execution lifecycle.
   */
  abstract execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>
}

// ---------------------------------------------------------------------------
// Tool Input Validator
// ---------------------------------------------------------------------------

export abstract class IToolInputValidator {
  /**
   * Validate tool input against the tool's schema.
   * Returns sanitized input or throws.
   */
  abstract validate(
    toolName: string,
    input: Record<string, unknown>,
    schema: ToolSchema,
  ): Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Verifier
// ---------------------------------------------------------------------------

export abstract class IAgentVerifier {
  /**
   * Run verification checks on the agent's work before returning final answer.
   */
  abstract verify(input: VerificationInput): Promise<VerificationOutput>
}

export interface VerificationInput {
  readonly executionId: EntityId
  readonly finalResponse: string
  readonly toolResults: readonly ToolCallRecordForVerification[]
  readonly userRequest: string
  readonly organizationId: EntityId
}

export interface ToolCallRecordForVerification {
  readonly toolName: string
  readonly success: boolean
  readonly summary: string
}

export interface VerificationOutput {
  readonly passed: boolean
  readonly checks: readonly VerificationCheck[]
  readonly warnings: readonly string[]
}

export interface VerificationCheck {
  readonly name: string
  readonly passed: boolean
  readonly details: string
}

// ---------------------------------------------------------------------------
// Agent Policy
// ---------------------------------------------------------------------------

export abstract class IAgentPolicy {
  /**
   * Get the capability set for an agent execution.
   */
  abstract getCapabilities(executionContext: PolicyContext): Promise<AgentPolicyResult>

  /**
   * Check if a specific action is permitted.
   */
  abstract checkAction(action: string, context: PolicyContext): Promise<ToolAuthorizationDecision>
}

export interface PolicyContext {
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly userRole: string
  readonly userPermissionLevel: string
}

export interface AgentPolicyResult {
  readonly capabilities: readonly string[]
  readonly maxIterations: number
  readonly maxToolCalls: number
  readonly maxTokens: number
  readonly maxCost: number
  readonly maxDurationMs: Milliseconds
  readonly allowedTools: readonly string[]
  readonly blockedTools: readonly string[]
}

// ---------------------------------------------------------------------------
// Memory Store
// ---------------------------------------------------------------------------

export abstract class IMemoryStore {
  abstract get(key: string): Promise<MemoryEntry | null>
  abstract set(key: string, value: MemoryEntry, ttlMs?: Milliseconds): Promise<void>
  abstract delete(key: string): Promise<void>
  abstract list(prefix?: string): Promise<readonly MemoryEntry[]>
}

export interface MemoryEntry {
  readonly key: string
  readonly value: Record<string, unknown>
  readonly executionId: EntityId
  readonly organizationId: EntityId
  readonly createdAt: Timestamp
  readonly expiresAt: Timestamp | null
}

// ---------------------------------------------------------------------------
// Agent Execution Repository
// ---------------------------------------------------------------------------

export abstract class IAgentExecutionRepository {
  abstract create(data: ExecutionCreateData): Promise<void>
  abstract findById(executionId: EntityId): Promise<ExecutionRecord | null>
  abstract findByUser(userId: EntityId, limit?: number): Promise<readonly ExecutionRecord[]>
  abstract findByOrganization(
    organizationId: EntityId,
    limit?: number,
  ): Promise<readonly ExecutionRecord[]>
  abstract updateStatus(
    executionId: EntityId,
    status: AgentExecutionStatus,
    extra?: ExecutionUpdateExtra,
  ): Promise<void>
  abstract addStep(data: StepRecordData): Promise<void>
  abstract updateStep(stepId: EntityId, updates: StepRecordUpdates): Promise<void>
  abstract addToolCall(data: ToolCallRecordData): Promise<void>
  abstract updateToolCall(toolCallId: EntityId, updates: ToolCallRecordUpdates): Promise<void>
  abstract addObservation(data: ObservationRecordData): Promise<void>
  abstract addVerification(data: VerificationRecordData): Promise<void>
  abstract getSteps(executionId: EntityId): Promise<readonly StepRecord[]>
  abstract getToolCalls(executionId: EntityId): Promise<readonly ToolCallRecord[]>
  abstract getObservations(executionId: EntityId): Promise<readonly ObservationRecord[]>
  abstract getVerifications(executionId: EntityId): Promise<readonly VerificationRecord[]>
  abstract getAnalytics(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<ExecutionAnalyticsRecord>
}

// ---------------------------------------------------------------------------
// Repository data types
// ---------------------------------------------------------------------------

export interface ExecutionCreateData {
  readonly executionId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userRequest: string
  readonly config: Record<string, unknown>
}

export interface ExecutionRecord {
  readonly executionId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly userRequest: string
  readonly status: AgentExecutionStatus
  readonly currentStepIndex: number
  readonly totalSteps: number
  readonly iterationCount: number
  readonly toolCallCount: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
  readonly finalResponse: string | null
  readonly errorMessage: string | null
  readonly metadata: Record<string, unknown>
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
  readonly completedAt: Timestamp | null
}

export interface ExecutionUpdateExtra {
  readonly finalResponse?: string | null
  readonly errorMessage?: string | null
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly estimatedCost?: number
  readonly currentStepIndex?: number
  readonly iterationCount?: number
  readonly toolCallCount?: number
  readonly totalSteps?: number
}

export interface StepRecordData {
  readonly stepId: EntityId
  readonly executionId: EntityId
  readonly stepIndex: number
  readonly stepType: string
  readonly purpose: string
  readonly toolName: string | null
}

export interface StepRecord {
  readonly stepId: EntityId
  readonly executionId: EntityId
  readonly stepIndex: number
  readonly stepType: string
  readonly purpose: string
  readonly toolName: string | null
  readonly status: string
  readonly input: Record<string, unknown>
  readonly output: Record<string, unknown> | null
  readonly errorMessage: string | null
  readonly durationMs: Milliseconds | null
  readonly createdAt: Timestamp
  readonly completedAt: Timestamp | null
}

export interface StepRecordUpdates {
  readonly status?: string
  readonly output?: Record<string, unknown>
  readonly errorMessage?: string
  readonly durationMs?: Milliseconds
}

export interface ToolCallRecordData {
  readonly toolCallId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly toolName: string
  readonly input: Record<string, unknown>
}

export interface ToolCallRecord {
  readonly toolCallId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly toolName: string
  readonly input: Record<string, unknown>
  readonly output: Record<string, unknown> | null
  readonly status: string
  readonly failureReason: string | null
  readonly policyDecision: string | null
  readonly durationMs: Milliseconds | null
  readonly createdAt: Timestamp
  readonly completedAt: Timestamp | null
}

export interface ToolCallRecordUpdates {
  readonly output?: Record<string, unknown> | null
  readonly status?: string | null
  readonly failureReason?: string | null
  readonly policyDecision?: string | null
  readonly durationMs?: Milliseconds | null
}

export interface ObservationRecordData {
  readonly observationId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly toolName: string
  readonly summary: string
  readonly data: Record<string, unknown>
}

export interface ObservationRecord {
  readonly observationId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly toolName: string
  readonly summary: string
  readonly data: Record<string, unknown>
  readonly createdAt: Timestamp
}

export interface VerificationRecordData {
  readonly verificationId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly checkType: string
  readonly status: string
  readonly details: Record<string, unknown>
}

export interface VerificationRecord {
  readonly verificationId: EntityId
  readonly executionId: EntityId
  readonly stepId: EntityId
  readonly checkType: string
  readonly status: string
  readonly details: Record<string, unknown>
  readonly createdAt: Timestamp
}

export interface ExecutionAnalyticsRecord {
  readonly totalExecutions: number
  readonly completedExecutions: number
  readonly failedExecutions: number
  readonly cancelledExecutions: number
  readonly averageDurationMs: number
  readonly averageIterations: number
  readonly averageToolCalls: number
  readonly totalToolCalls: number
  readonly toolFailures: number
  readonly policyDenials: number
  readonly averageContextSize: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly estimatedTotalCost: number
  readonly verificationFailures: number
}

// ---------------------------------------------------------------------------
// Injection Detector
// ---------------------------------------------------------------------------

export abstract class IInjectionDetector {
  abstract detect(text: string): InjectionDetectionResult
  abstract scanUserInput(input: string): InjectionDetectionResult
  abstract scanToolOutput(toolName: string, output: string): InjectionDetectionResult
  abstract scanContext(context: string): InjectionDetectionResult
}

export interface InjectionDetectionResult {
  readonly detected: boolean
  readonly patterns: readonly string[]
  readonly confidence: number
  readonly action: 'BLOCK' | 'SANITIZE' | 'ALLOW'
}

// ---------------------------------------------------------------------------
// Cost Calculator
// ---------------------------------------------------------------------------

export abstract class IAgentCostCalculator {
  abstract calculate(
    inputTokens: number,
    outputTokens: number,
    provider: string,
    model: string,
  ): number
  abstract checkBudget(estimatedCost: number, maxCost: number): boolean
}

// ---------------------------------------------------------------------------
// Loop Detector
// ---------------------------------------------------------------------------

export abstract class ILoopDetector {
  abstract record(toolName: string, input: Record<string, unknown>): void
  abstract isLooping(toolName: string, input: Record<string, unknown>, threshold: number): boolean
  abstract reset(executionId: string): void
}
