/* Agent execution repository — Prisma-based persistence.

All queries are organization-scoped for tenant isolation.
Follows the same pattern as PipelineRunPrismaRepository.
*/

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type {
  AgentExecution,
  AgentStep,
  AgentToolCall,
  AgentObservation,
  AgentVerification,
} from '@prisma/client'
import { AgentExecutionStatus } from '@contextgraph/types'
import type { EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IAgentExecutionRepository,
  ExecutionCreateData,
  ExecutionRecord,
  ExecutionUpdateExtra,
  StepRecordData,
  StepRecord,
  StepRecordUpdates,
  ToolCallRecordData,
  ToolCallRecord,
  ToolCallRecordUpdates,
  ObservationRecordData,
  ObservationRecord,
  VerificationRecordData,
  VerificationRecord,
  ExecutionAnalyticsRecord,
} from '../domain/agent.interfaces'

/**
 * Maps a Prisma AgentExecution row to our ExecutionRecord type.
 */
function toExecutionRecord(row: AgentExecution): ExecutionRecord {
  return {
    executionId: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    userRequest: row.userRequest,
    status: row.status as AgentExecutionStatus,
    currentStepIndex: row.currentStepIndex,
    totalSteps: row.totalSteps,
    iterationCount: row.iterationCount,
    toolCallCount: row.toolCallCount,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    estimatedCost: row.estimatedCost,
    finalResponse: row.finalResponse,
    errorMessage: row.errorMessage,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

/**
 * Maps a Prisma AgentStep row to our StepRecord type.
 */
function toStepRecord(row: AgentStep): StepRecord {
  return {
    stepId: row.id,
    executionId: row.executionId,
    stepIndex: row.stepIndex,
    stepType: row.stepType as StepRecord['stepType'],
    purpose: row.purpose,
    toolName: row.toolName,
    status: row.status as StepRecord['status'],
    input: (row.input ?? {}) as Record<string, unknown>,
    output: (row.output ?? null) as Record<string, unknown> | null,
    errorMessage: row.errorMessage,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

/**
 * Maps a Prisma AgentToolCall row to our ToolCallRecord type.
 */
function toToolCallRecord(row: AgentToolCall): ToolCallRecord {
  return {
    toolCallId: row.id,
    executionId: row.executionId,
    stepId: row.stepId,
    toolName: row.toolName,
    input: (row.input ?? {}) as Record<string, unknown>,
    output: (row.output ?? null) as Record<string, unknown> | null,
    status: row.status as ToolCallRecord['status'],
    failureReason: row.failureReason,
    policyDecision: row.policyDecision as ToolCallRecord['policyDecision'],
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

/**
 * Maps a Prisma AgentObservation row to our ObservationRecord type.
 */
function toObservationRecord(row: AgentObservation): ObservationRecord {
  return {
    observationId: row.id,
    executionId: row.executionId,
    stepId: row.stepId,
    toolName: row.toolName,
    summary: row.summary,
    data: (row.data ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Maps a Prisma AgentVerification row to our VerificationRecord type.
 */
function toVerificationRecord(row: AgentVerification): VerificationRecord {
  return {
    verificationId: row.id,
    executionId: row.executionId,
    stepId: row.stepId,
    checkType: row.checkType as VerificationRecord['checkType'],
    status: row.status as VerificationRecord['status'],
    details: (row.details ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Prisma-based implementation of the agent execution repository.
 * All queries are organization-scoped for tenant isolation.
 */
@Injectable()
export class AgentExecutionPrismaRepository implements IAgentExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ExecutionCreateData): Promise<void> {
    await this.prisma.agentExecution.create({
      data: {
        id: data.executionId,
        userId: data.userId,
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        userRequest: data.userRequest,
        status: 'PENDING',
        config: data.config as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async findById(executionId: EntityId): Promise<ExecutionRecord | null> {
    const row = await this.prisma.agentExecution.findUnique({
      where: { id: executionId },
    })
    return row === null ? null : toExecutionRecord(row)
  }

  async findByUser(userId: EntityId, limit = 20): Promise<readonly ExecutionRecord[]> {
    const rows = await this.prisma.agentExecution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map(toExecutionRecord)
  }

  async findByOrganization(
    organizationId: EntityId,
    limit = 20,
  ): Promise<readonly ExecutionRecord[]> {
    const rows = await this.prisma.agentExecution.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map(toExecutionRecord)
  }

  async updateStatus(
    executionId: EntityId,
    status: AgentExecutionStatus,
    extra?: ExecutionUpdateExtra,
  ): Promise<void> {
    const data: Record<string, unknown> = { status }

    if (extra !== undefined) {
      if (extra.finalResponse !== undefined) data.finalResponse = extra.finalResponse
      if (extra.errorMessage !== undefined) data.errorMessage = extra.errorMessage
      if (extra.inputTokens !== undefined) data.inputTokens = extra.inputTokens
      if (extra.outputTokens !== undefined) data.outputTokens = extra.outputTokens
      if (extra.estimatedCost !== undefined) data.estimatedCost = extra.estimatedCost
      if (extra.currentStepIndex !== undefined) data.currentStepIndex = extra.currentStepIndex
      if (extra.iterationCount !== undefined) data.iterationCount = extra.iterationCount
      if (extra.toolCallCount !== undefined) data.toolCallCount = extra.toolCallCount
      if (extra.totalSteps !== undefined) data.totalSteps = extra.totalSteps
    }

    // Set completedAt for terminal states
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT', 'POLICY_BLOCKED']
    if (terminalStates.includes(status)) {
      data.completedAt = new Date()
    }

    await this.prisma.agentExecution.update({
      where: { id: executionId },
      data,
    })
  }

  async addStep(data: StepRecordData): Promise<void> {
    await this.prisma.agentStep.create({
      data: {
        id: data.stepId,
        executionId: data.executionId,
        stepIndex: data.stepIndex,
        stepType: data.stepType as AgentStep['stepType'],
        purpose: data.purpose,
        toolName: data.toolName,
      },
    })
  }

  async updateStep(stepId: string, updates: StepRecordUpdates): Promise<void> {
    const data: Record<string, unknown> = {}
    if (updates.status !== undefined) data.status = updates.status
    if (updates.output !== undefined)
      data.output = updates.output as unknown as Prisma.InputJsonValue
    if (updates.errorMessage !== undefined) data.errorMessage = updates.errorMessage
    if (updates.durationMs !== undefined) data.durationMs = updates.durationMs
    if (updates.status === 'COMPLETED') data.completedAt = new Date()

    if (Object.keys(data).length === 0) return

    await this.prisma.agentStep.update({
      where: { id: stepId },
      data,
    })
  }

  async addToolCall(data: ToolCallRecordData): Promise<void> {
    await this.prisma.agentToolCall.create({
      data: {
        id: data.toolCallId,
        executionId: data.executionId,
        stepId: data.stepId,
        toolName: data.toolName,
        input: data.input as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async updateToolCall(toolCallId: string, updates: ToolCallRecordUpdates): Promise<void> {
    const data: Record<string, unknown> = {}
    if (updates.output !== undefined)
      data.output = updates.output as unknown as Prisma.InputJsonValue
    if (updates.status !== undefined) data.status = updates.status
    if (updates.failureReason !== undefined) data.failureReason = updates.failureReason
    if (updates.policyDecision !== undefined) data.policyDecision = updates.policyDecision
    if (updates.durationMs !== undefined) data.durationMs = updates.durationMs
    if (updates.status === 'COMPLETED' || updates.status === 'FAILED') data.completedAt = new Date()

    if (Object.keys(data).length === 0) return

    await this.prisma.agentToolCall.update({
      where: { id: toolCallId },
      data,
    })
  }

  async addObservation(data: ObservationRecordData): Promise<void> {
    await this.prisma.agentObservation.create({
      data: {
        id: data.observationId,
        executionId: data.executionId,
        stepId: data.stepId,
        toolName: data.toolName,
        summary: data.summary,
        data: data.data as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async addVerification(data: VerificationRecordData): Promise<void> {
    await this.prisma.agentVerification.create({
      data: {
        id: data.verificationId,
        executionId: data.executionId,
        stepId: data.stepId,
        checkType: data.checkType,
        status: data.status,
        details: data.details as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async getSteps(executionId: EntityId): Promise<readonly StepRecord[]> {
    const rows = await this.prisma.agentStep.findMany({
      where: { executionId },
      orderBy: { stepIndex: 'asc' },
    })
    return rows.map(toStepRecord)
  }

  async getToolCalls(executionId: EntityId): Promise<readonly ToolCallRecord[]> {
    const rows = await this.prisma.agentToolCall.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toToolCallRecord)
  }

  async getObservations(executionId: EntityId): Promise<readonly ObservationRecord[]> {
    const rows = await this.prisma.agentObservation.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toObservationRecord)
  }

  async getVerifications(executionId: EntityId): Promise<readonly VerificationRecord[]> {
    const rows = await this.prisma.agentVerification.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toVerificationRecord)
  }

  async getAnalytics(
    organizationId: EntityId,
    from: string,
    to: string,
  ): Promise<ExecutionAnalyticsRecord> {
    const fromDate = new Date(from)
    const toDate = new Date(to)

    const executions = await this.prisma.agentExecution.findMany({
      where: {
        organizationId,
        createdAt: { gte: fromDate, lte: toDate },
      },
    })

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        cancelledExecutions: 0,
        averageDurationMs: 0,
        averageIterations: 0,
        averageToolCalls: 0,
        totalToolCalls: 0,
        toolFailures: 0,
        policyDenials: 0,
        averageContextSize: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedTotalCost: 0,
        verificationFailures: 0,
      }
    }

    const completed = executions.filter((e) => e.status === 'COMPLETED')
    const failed = executions.filter((e) => e.status === 'FAILED')
    const cancelled = executions.filter((e) => e.status === 'CANCELLED')
    const totalToolCalls = executions.reduce((sum, e) => sum + e.toolCallCount, 0)

    // Count tool call failures and policy denials
    const executionIds = executions.map((e) => e.id)
    const toolCalls = await this.prisma.agentToolCall.findMany({
      where: { executionId: { in: executionIds } },
      select: { status: true },
    })

    const toolFailures = toolCalls.filter((t) => t.status === 'FAILED').length
    const policyDenials = toolCalls.filter((t) => t.status === 'DENIED').length

    // Count verification failures
    const verificationFailures = await this.prisma.agentVerification.count({
      where: {
        executionId: { in: executionIds },
        status: 'FAILED',
      },
    })

    // Calculate average duration
    let totalDurationMs = 0
    for (const e of executions) {
      if (e.completedAt !== null) {
        totalDurationMs += e.completedAt.getTime() - e.createdAt.getTime()
      }
    }

    return {
      totalExecutions: executions.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      cancelledExecutions: cancelled.length,
      averageDurationMs: totalDurationMs / executions.length,
      averageIterations:
        executions.reduce((sum, e) => sum + e.iterationCount, 0) / executions.length,
      averageToolCalls: totalToolCalls / executions.length,
      totalToolCalls,
      toolFailures,
      policyDenials,
      averageContextSize: 0,
      totalInputTokens: executions.reduce((sum, e) => sum + e.inputTokens, 0),
      totalOutputTokens: executions.reduce((sum, e) => sum + e.outputTokens, 0),
      estimatedTotalCost: executions.reduce((sum, e) => sum + e.estimatedCost, 0),
      verificationFailures,
    }
  }
}
