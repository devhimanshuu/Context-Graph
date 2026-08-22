/* Agent API controller — REST endpoints for agent orchestration.

POST   /api/v1/agents/run                     — Start an agent execution
GET    /api/v1/agents/executions/:id           — Get execution details
GET    /api/v1/agents/executions/:id/steps     — Get execution steps
GET    /api/v1/agents/executions/:id/tools     — Get execution tool calls
GET    /api/v1/agents/executions/:id/trace     — Get execution trace
GET    /api/v1/agents/executions               — List user's executions
GET    /api/v1/agents/analytics                — Get analytics
POST   /api/v1/agents/approvals/:id/decide     — Approve/reject a pending action
GET    /api/v1/agents/executions/:id/stream    — SSE stream of execution events
*/

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Sse,
  MessageEvent,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { type Observable, map } from 'rxjs'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IAgentRuntime, IAgentExecutionRepository, IAgentPolicy } from './domain/agent.interfaces'
import {
  runAgentRequestSchema,
  executionParamsSchema,
  executionQuerySchema,
  analyticsQuerySchema,
  type RunAgentRequestValidated,
} from './agent.validation'
import { HumanApprovalService } from './approval/human-approval.service'
import { AgentObservability } from './observability/agent-observability'
import { AgentEventEmitter } from './observability/agent-event-emitter'
import type {
  AgentExecutionResponseDto,
  AgentExecutionDetailDto,
  AgentAnalyticsResponseDto,
  AgentListResponseDto,
  AgentStepResponseDto,
  AgentToolCallResponseDto,
} from './agent.dto'

@ApiTags('Agent Orchestration')
@Controller('api/v1/agents')
export class AgentController {
  constructor(
    @Inject(IAgentRuntime) private readonly runtime: IAgentRuntime,
    @Inject(IAgentExecutionRepository) private readonly repository: IAgentExecutionRepository,
    @Inject(IAgentPolicy) private readonly policy: IAgentPolicy,
    private readonly approvalService: HumanApprovalService,
    private readonly observability: AgentObservability,
    private readonly eventEmitter: AgentEventEmitter,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run an agent execution' })
  @ApiResponse({ status: 200, description: 'Agent execution completed' })
  async runAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(runAgentRequestSchema)) body: RunAgentRequestValidated,
  ): Promise<AgentExecutionResponseDto> {
    const result = await this.runtime.execute({
      userRequest: body.userRequest,
      user,
      workspaceId: body.workspaceId,
      entryContext: body.entryContext,
    })

    // Record observability metric
    this.observability.recordExecution({
      executionId: result.executionId,
      organizationId: user.organizationId,
      status: result.status,
      durationMs: result.durationMs,
      iterations: result.iterations,
      toolCalls: result.toolCalls,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: result.estimatedCost,
      verificationPassed: result.error === null,
      timestamp: Date.now(),
    })

    return {
      executionId: result.executionId,
      status: result.status,
      userRequest: body.userRequest,
      finalResponse: result.finalResponse,
      iterations: result.iterations,
      toolCalls: result.toolCalls,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: result.estimatedCost,
      durationMs: result.durationMs,
      error: result.error,
      createdAt: new Date().toISOString(),
      completedAt: result.error === null ? new Date().toISOString() : null,
    }
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
    @Query(new ZodValidationPipe(executionQuerySchema))
    query: {
      includeSteps?: boolean
      includeToolCalls?: boolean
      includeObservations?: boolean
      includeVerifications?: boolean
    },
  ): Promise<AgentExecutionDetailDto> {
    const record = await this.repository.findById(params.id)
    if (record === null || record.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    const steps = query.includeSteps === true ? await this.repository.getSteps(params.id) : []
    const toolCallsList =
      query.includeToolCalls === true ? await this.repository.getToolCalls(params.id) : []
    const observations =
      query.includeObservations === true ? await this.repository.getObservations(params.id) : []
    const verifications =
      query.includeVerifications === true ? await this.repository.getVerifications(params.id) : []

    return {
      executionId: record.executionId,
      status: record.status,
      userRequest: record.userRequest,
      finalResponse: record.finalResponse,
      iterations: record.iterationCount,
      toolCalls: record.toolCallCount,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      estimatedCost: record.estimatedCost,
      durationMs:
        record.completedAt !== null
          ? new Date(record.completedAt).getTime() - new Date(record.createdAt).getTime()
          : 0,
      error: record.errorMessage,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      steps: steps.map((s) => ({
        stepId: s.stepId,
        stepIndex: s.stepIndex,
        stepType: s.stepType,
        purpose: s.purpose,
        toolName: s.toolName,
        status: s.status,
        durationMs: s.durationMs,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      })),
      toolCallsList: toolCallsList.map((t) => ({
        toolCallId: t.toolCallId,
        toolName: t.toolName,
        status: t.status,
        failureReason: t.failureReason,
        policyDecision: t.policyDecision,
        durationMs: t.durationMs,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      observations: observations.map((o) => ({
        observationId: o.observationId,
        toolName: o.toolName,
        summary: o.summary,
        createdAt: o.createdAt,
      })),
      verifications: verifications.map((v) => ({
        verificationId: v.verificationId,
        checkType: v.checkType,
        status: v.status,
        createdAt: v.createdAt,
      })),
      trace: [],
    }
  }

  @Get('executions/:id/steps')
  @ApiOperation({ summary: 'Get execution steps' })
  async getExecutionSteps(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<readonly AgentStepResponseDto[]> {
    const record = await this.repository.findById(params.id)
    if (record === null || record.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    const steps = await this.repository.getSteps(params.id)
    return steps.map((s) => ({
      stepId: s.stepId,
      stepIndex: s.stepIndex,
      stepType: s.stepType,
      purpose: s.purpose,
      toolName: s.toolName,
      status: s.status,
      durationMs: s.durationMs,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }))
  }

  @Get('executions/:id/tools')
  @ApiOperation({ summary: 'Get execution tool calls' })
  async getExecutionTools(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<readonly AgentToolCallResponseDto[]> {
    const record = await this.repository.findById(params.id)
    if (record === null || record.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    const toolCalls = await this.repository.getToolCalls(params.id)
    return toolCalls.map((t) => ({
      toolCallId: t.toolCallId,
      toolName: t.toolName,
      status: t.status,
      failureReason: t.failureReason,
      policyDecision: t.policyDecision,
      durationMs: t.durationMs,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }))
  }

  @Get('executions/:id/trace')
  @ApiOperation({ summary: 'Get execution trace (safe summaries only)' })
  async getExecutionTrace(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<
    readonly { timestamp: string; eventType: string; summary: string; stepIndex: number | null }[]
  > {
    const record = await this.repository.findById(params.id)
    if (record === null || record.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    // Return safe execution summaries — never expose chain-of-thought
    const steps = await this.repository.getSteps(params.id)
    const toolCalls = await this.repository.getToolCalls(params.id)

    const trace: {
      timestamp: string
      eventType: string
      summary: string
      stepIndex: number | null
    }[] = []

    for (const step of steps) {
      trace.push({
        timestamp: step.createdAt,
        eventType: `STEP_${step.stepType}`,
        summary: step.purpose,
        stepIndex: step.stepIndex,
      })
    }

    for (const tc of toolCalls) {
      trace.push({
        timestamp: tc.createdAt,
        eventType: `TOOL_${tc.status}`,
        summary: `${tc.toolName}: ${tc.status}`,
        stepIndex: null,
      })
    }

    return trace.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  @Get('executions')
  @ApiOperation({ summary: 'List user executions' })
  async listExecutions(@CurrentUser() user: AuthenticatedUser): Promise<AgentListResponseDto> {
    const records = await this.repository.findByUser(user.id)
    return {
      executions: records.map((r) => ({
        executionId: r.executionId,
        status: r.status,
        userRequest: r.userRequest,
        finalResponse: r.finalResponse,
        iterations: r.iterationCount,
        toolCalls: r.toolCallCount,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        estimatedCost: r.estimatedCost,
        durationMs:
          r.completedAt !== null
            ? new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime()
            : 0,
        error: r.errorMessage,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      total: records.length,
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get agent analytics' })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: { from: string; to: string },
  ): Promise<AgentAnalyticsResponseDto> {
    const analytics = await this.repository.getAnalytics(user.organizationId, query.from, query.to)

    return {
      ...analytics,
      completionRate:
        analytics.totalExecutions > 0
          ? analytics.completedExecutions / analytics.totalExecutions
          : 0,
      periodStart: query.from,
      periodEnd: query.to,
    }
  }

  @Post('approvals/:id/decide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a pending agent action' })
  async decideApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') approvalId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; note?: string },
  ): Promise<{ approved: boolean }> {
    const approved = await this.approvalService.processDecision(
      approvalId,
      body.decision,
      user.id,
      body.note,
    )

    return { approved }
  }

  @Get('executions/:id/stream')
  @Sse()
  @ApiOperation({ summary: 'SSE stream of real-time agent execution events' })
  @ApiResponse({ status: 200, description: 'Event stream' })
  streamExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Observable<MessageEvent> {
    return this.eventEmitter.stream(params.id).pipe(
      map((event) => ({
        type: event.event,
        data: event.data,
        id: event.id,
      })),
    )
  }
}
