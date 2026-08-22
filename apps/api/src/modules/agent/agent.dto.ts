/* Agent API DTOs — request and response shapes. */

import type { AgentExecutionStatus } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface RunAgentRequestDto {
  readonly userRequest: string
  readonly workspaceId: string
  readonly entryContext?: Record<string, unknown>
  readonly modelProvider?: string
  readonly modelName?: string
}

export interface GetExecutionQueryDto {
  readonly includeSteps?: boolean
  readonly includeToolCalls?: boolean
  readonly includeObservations?: boolean
  readonly includeVerifications?: boolean
}

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

export interface AgentExecutionResponseDto {
  readonly executionId: string
  readonly status: AgentExecutionStatus
  readonly userRequest: string
  readonly finalResponse: string | null
  readonly iterations: number
  readonly toolCalls: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
  readonly durationMs: number
  readonly error: string | null
  readonly createdAt: string
  readonly completedAt: string | null
}

export interface AgentExecutionDetailDto extends AgentExecutionResponseDto {
  readonly steps: readonly AgentStepResponseDto[]
  readonly toolCallsList: readonly AgentToolCallResponseDto[]
  readonly observations: readonly AgentObservationResponseDto[]
  readonly verifications: readonly AgentVerificationResponseDto[]
  readonly trace: readonly AgentTraceEntryDto[]
}

export interface AgentStepResponseDto {
  readonly stepId: string
  readonly stepIndex: number
  readonly stepType: string
  readonly purpose: string
  readonly toolName: string | null
  readonly status: string
  readonly durationMs: number | null
  readonly createdAt: string
  readonly completedAt: string | null
}

export interface AgentToolCallResponseDto {
  readonly toolCallId: string
  readonly toolName: string
  readonly status: string
  readonly failureReason: string | null
  readonly policyDecision: string | null
  readonly durationMs: number | null
  readonly createdAt: string
  readonly completedAt: string | null
}

export interface AgentObservationResponseDto {
  readonly observationId: string
  readonly toolName: string
  readonly summary: string
  readonly createdAt: string
}

export interface AgentVerificationResponseDto {
  readonly verificationId: string
  readonly checkType: string
  readonly status: string
  readonly createdAt: string
}

export interface AgentTraceEntryDto {
  readonly timestamp: string
  readonly eventType: string
  readonly summary: string
  readonly stepIndex: number | null
  readonly metadata: Record<string, unknown>
}

export interface AgentAnalyticsResponseDto {
  readonly totalExecutions: number
  readonly completedExecutions: number
  readonly failedExecutions: number
  readonly cancelledExecutions: number
  readonly completionRate: number
  readonly averageDurationMs: number
  readonly averageIterations: number
  readonly averageToolCalls: number
  readonly totalToolCalls: number
  readonly toolFailures: number
  readonly policyDenials: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly estimatedTotalCost: number
  readonly verificationFailures: number
  readonly periodStart: string
  readonly periodEnd: string
}

export interface AgentListResponseDto {
  readonly executions: readonly AgentExecutionResponseDto[]
  readonly total: number
}
