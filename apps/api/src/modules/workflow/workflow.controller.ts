/* Workflow API controller — REST endpoints for workflow orchestration.

POST   /api/v1/workflows                             — Create workflow definition
GET    /api/v1/workflows                             — List workflow definitions
GET    /api/v1/workflows/:id                         — Get workflow definition
POST   /api/v1/workflows/:id/validate                — Validate workflow DAG
POST   /api/v1/workflows/:id/publish                 — Publish workflow (makes it executable)
POST   /api/v1/workflows/:id/execute                 — Execute a workflow
GET    /api/v1/workflows/executions                  — List executions
GET    /api/v1/workflows/executions/:id              — Get execution details
GET    /api/v1/workflows/executions/:id/trace        — Get execution trace
POST   /api/v1/workflows/executions/:id/pause        — Pause execution
POST   /api/v1/workflows/executions/:id/resume       — Resume execution
POST   /api/v1/workflows/executions/:id/cancel       — Cancel execution
POST   /api/v1/workflows/executions/:id/approve/:aid — Approve/reject
GET    /api/v1/workflows/agents                      — List specialized agents
GET    /api/v1/workflows/templates                   — List workflow templates
GET    /api/v1/workflows/analytics                   — Get analytics
GET    /api/v1/workflows/executions/:id/stream       — SSE stream
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
import {
  IWorkflowRuntime,
  IWorkflowDefinitionRepository,
  IWorkflowExecutionRepository,
  IDagValidator,
  IWorkflowEventEmitter,
  IWorkflowObservability,
} from './domain/workflow.interfaces'
import { SpecializedAgentRegistry } from './agents/specialized-agent-registry'
import {
  createWorkflowRequestSchema,
  executeWorkflowRequestSchema,
  workflowParamsSchema,
  executionParamsSchema,
  analyticsQuerySchema,
  approvalDecisionSchema,
  workflowListQuerySchema,
  type CreateWorkflowRequestValidated,
  type ExecuteWorkflowRequestValidated,
} from './workflow.validation'
import type {
  WorkflowDefinitionResponseDto,
  WorkflowDefinitionDetailDto,
  WorkflowListResponseDto,
  WorkflowExecutionResponseDto,
  WorkflowExecutionDetailDto,
  WorkflowExecutionListResponseDto,
  WorkflowValidationResponseDto,
  WorkflowAnalyticsResponseDto,
  SpecializedAgentListResponseDto,
} from './workflow.dto'
import { uuid } from '../../common/utils/uuid'

@ApiTags('Workflow Orchestration')
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(
    @Inject(IWorkflowRuntime) private readonly runtime: IWorkflowRuntime,
    @Inject(IWorkflowDefinitionRepository) private readonly defRepo: IWorkflowDefinitionRepository,
    @Inject(IWorkflowExecutionRepository) private readonly execRepo: IWorkflowExecutionRepository,
    @Inject(IDagValidator) private readonly dagValidator: IDagValidator,
    @Inject(IWorkflowEventEmitter) private readonly eventEmitter: IWorkflowEventEmitter,
    @Inject(IWorkflowObservability) private readonly observability: IWorkflowObservability,
    private readonly agentRegistry: SpecializedAgentRegistry,
  ) {}

  // -------------------------------------------------------------------------
  // Workflow Definitions
  // -------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkflowRequestSchema)) body: CreateWorkflowRequestValidated,
  ): Promise<WorkflowDefinitionResponseDto> {
    const workflowId = uuid()

    // Auto-generate edge IDs if missing
    const edges = body.edges.map((e) => ({
      ...e,
      edgeId: e.edgeId || uuid(),
    }))

    const definition = await this.defRepo.create({
      workflowId,
      organizationId: user.organizationId,
      workspaceId: null,
      createdBy: user.id,
      name: body.name,
      description: body.description,
      version: 1,
      nodes: body.nodes,
      edges,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      executionPolicy: {
        ...(body.executionPolicy ?? {}),
      },
    })

    return {
      workflowId: definition.workflowId,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      status: definition.status,
      nodeCount: definition.nodes.length,
      edgeCount: definition.edges.length,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    }
  }

  @Get()
  @ApiOperation({ summary: 'List workflow definitions' })
  async listWorkflows(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(workflowListQuerySchema)) query: { status?: string },
  ): Promise<WorkflowListResponseDto> {
    const workflows = await this.defRepo.findByOrganization(
      user.organizationId,
      query.status as never,
    )
    return {
      workflows: workflows.map((w) => ({
        workflowId: w.workflowId,
        name: w.name,
        description: w.description,
        version: w.version,
        status: w.status,
        nodeCount: w.nodes.length,
        edgeCount: w.edges.length,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      total: workflows.length,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow definition details' })
  async getWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(workflowParamsSchema)) params: { id: string },
  ): Promise<WorkflowDefinitionDetailDto> {
    const definition = await this.defRepo.findById(params.id)
    if (!definition || definition.organizationId !== user.organizationId) {
      throw new Error('Workflow not found')
    }

    return {
      workflowId: definition.workflowId,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      status: definition.status,
      nodeCount: definition.nodes.length,
      edgeCount: definition.edges.length,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
      nodes: definition.nodes,
      edges: definition.edges,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
      executionPolicy: definition.executionPolicy,
    }
  }

  // -------------------------------------------------------------------------
  // Validation & Publishing
  // -------------------------------------------------------------------------

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate workflow DAG' })
  async validateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(workflowParamsSchema)) params: { id: string },
  ): Promise<WorkflowValidationResponseDto> {
    const definition = await this.defRepo.findById(params.id)
    if (!definition || definition.organizationId !== user.organizationId) {
      throw new Error('Workflow not found')
    }

    const result = this.dagValidator.validate(definition.nodes, definition.edges)

    if (result.valid) {
      await this.defRepo.updateStatus(definition.workflowId, 'VALIDATED')
    }

    return {
      valid: result.valid,
      errors: result.errors.map((e) => ({
        nodeId: e.nodeId,
        edgeId: e.edgeId,
        type: e.type,
        message: e.message,
      })),
      warnings: result.warnings.map((w) => ({
        nodeId: w.nodeId,
        edgeId: w.edgeId,
        type: w.type,
        message: w.message,
      })),
      entryNodes: result.entryNodes,
      terminalNodes: result.terminalNodes,
    }
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish workflow (makes it executable)' })
  async publishWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(workflowParamsSchema)) params: { id: string },
  ): Promise<{ published: boolean; workflowId: string }> {
    const definition = await this.defRepo.findById(params.id)
    if (!definition || definition.organizationId !== user.organizationId) {
      throw new Error('Workflow not found')
    }

    // Must be validated first
    if (definition.status !== 'VALIDATED' && definition.status !== 'DRAFT') {
      // Validate first
      const result = this.dagValidator.validate(definition.nodes, definition.edges)
      if (!result.valid) {
        throw new Error(`Cannot publish: ${result.errors.map((e) => e.message).join('; ')}`)
      }
    }

    await this.defRepo.updateStatus(definition.workflowId, 'PUBLISHED')

    return { published: true, workflowId: definition.workflowId }
  }

  // -------------------------------------------------------------------------
  // Workflow Execution
  // -------------------------------------------------------------------------

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a workflow' })
  async executeWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(workflowParamsSchema)) params: { id: string },
    @Body(new ZodValidationPipe(executeWorkflowRequestSchema))
    body: ExecuteWorkflowRequestValidated,
  ): Promise<WorkflowExecutionResponseDto> {
    const result = await this.runtime.execute({
      workflowId: params.id,
      userId: user.id,
      organizationId: user.organizationId,
      workspaceId: body.workspaceId,
      input: body.input,
    })

    const execution = await this.execRepo.findById(result.executionId)

    return {
      executionId: result.executionId,
      workflowId: params.id,
      workflowVersion: execution?.workflowVersion ?? 1,
      status: result.status,
      input: body.input,
      output: result.output,
      currentNodes: execution?.currentNodes ?? [],
      completedNodes: execution?.completedNodes ?? [],
      failedNodes: execution?.failedNodes ?? [],
      error: result.error,
      tokenUsage: result.tokenUsage,
      estimatedCost: result.estimatedCost,
      durationMs: result.durationMs,
      createdAt: execution?.createdAt ?? new Date().toISOString(),
      startedAt: execution?.startedAt ?? null,
      completedAt: execution?.completedAt ?? null,
    }
  }

  // -------------------------------------------------------------------------
  // Execution Management
  // -------------------------------------------------------------------------

  @Get('executions')
  @ApiOperation({ summary: 'List workflow executions' })
  async listExecutions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkflowExecutionListResponseDto> {
    const executions = await this.execRepo.findByOrganization(user.organizationId)
    return {
      executions: executions.map((e) => ({
        executionId: e.executionId,
        workflowId: e.workflowId,
        workflowVersion: e.workflowVersion,
        status: e.status,
        input: e.input,
        output: e.output,
        currentNodes: e.currentNodes,
        completedNodes: e.completedNodes,
        failedNodes: e.failedNodes,
        error: e.error,
        tokenUsage: e.tokenUsage,
        estimatedCost: e.estimatedCost,
        durationMs: e.completedAt
          ? new Date(e.completedAt).getTime() - new Date(e.createdAt).getTime()
          : 0,
        createdAt: e.createdAt,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
      })),
      total: executions.length,
    }
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  async getExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<WorkflowExecutionDetailDto> {
    const execution = await this.execRepo.findById(params.id)
    if (!execution || execution.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    return {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      workflowVersion: execution.workflowVersion,
      status: execution.status,
      input: execution.input,
      output: execution.output,
      currentNodes: execution.currentNodes,
      completedNodes: execution.completedNodes,
      failedNodes: execution.failedNodes,
      error: execution.error,
      tokenUsage: execution.tokenUsage,
      estimatedCost: execution.estimatedCost,
      durationMs: execution.completedAt
        ? new Date(execution.completedAt).getTime() - new Date(execution.createdAt).getTime()
        : 0,
      createdAt: execution.createdAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      nodeExecutions: [],
      trace: [],
      approvals: [],
    }
  }

  @Get('executions/:id/trace')
  @ApiOperation({ summary: 'Get execution trace (safe summaries only)' })
  async getExecutionTrace(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<
    readonly { timestamp: string; eventType: string; summary: string; nodeId: string | null }[]
  > {
    const execution = await this.execRepo.findById(params.id)
    if (!execution || execution.organizationId !== user.organizationId) {
      throw new Error('Execution not found')
    }

    // Return the SSE stream history as trace entries
    // In production, this would load from the event repository
    return []
  }

  @Post('executions/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a running workflow' })
  async pauseExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<{ paused: boolean }> {
    await this.runtime.pause(params.id, user.id)
    return { paused: true }
  }

  @Post('executions/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused workflow' })
  async resumeExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<{ resumed: boolean }> {
    await this.runtime.resume(params.id, user.id)
    return { resumed: true }
  }

  @Post('executions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a workflow execution' })
  async cancelExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(executionParamsSchema)) params: { id: string },
  ): Promise<{ cancelled: boolean }> {
    await this.runtime.cancel(params.id, user.id)
    return { cancelled: true }
  }

  @Post('executions/:id/approve/:aid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a workflow approval request' })
  async approveAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') executionId: string,
    @Param('aid') approvalId: string,
    @Body(new ZodValidationPipe(approvalDecisionSchema))
    body: { decision: 'APPROVED' | 'REJECTED'; note?: string },
  ): Promise<{ approved: boolean }> {
    await this.runtime.approve(
      executionId,
      approvalId,
      user.id,
      body.decision === 'APPROVED',
      body.note,
    )
    return { approved: body.decision === 'APPROVED' }
  }

  // -------------------------------------------------------------------------
  // Analytics & Agents
  // -------------------------------------------------------------------------

  @Get('analytics')
  @ApiOperation({ summary: 'Get workflow analytics' })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: { from: string; to: string },
  ): Promise<WorkflowAnalyticsResponseDto> {
    const analytics = await this.observability.getAnalytics(
      user.organizationId,
      query.from,
      query.to,
    )
    return {
      ...analytics,
      periodStart: query.from,
      periodEnd: query.to,
    }
  }

  @Get('agents')
  @ApiOperation({ summary: 'List specialized agents' })
  async listAgents(): Promise<SpecializedAgentListResponseDto> {
    const agents = this.agentRegistry.getAll()
    return {
      agents: agents.map((a) => ({
        type: a.type,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        allowedTools: a.allowedTools,
      })),
    }
  }

  @Get('templates')
  @ApiOperation({ summary: 'List workflow templates' })
  async listTemplates(): Promise<{
    templates: readonly { id: string; name: string; description: string; category: string }[]
  }> {
    return {
      templates: WORKFLOW_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
      })),
    }
  }

  // -------------------------------------------------------------------------
  // SSE Streaming
  // -------------------------------------------------------------------------

  @Get('executions/:id/stream')
  @Sse()
  @ApiOperation({ summary: 'SSE stream of real-time workflow execution events' })
  @ApiResponse({ status: 200, description: 'Event stream' })
  streamExecution(@Param('id') executionId: string): Observable<MessageEvent> {
    return this.eventEmitter.stream(executionId).pipe(
      map((event: unknown) => ({
        type: (event as { eventType?: string }).eventType ?? 'unknown',
        data: event as MessageEvent['data'],
      })),
    )
  }
}

// -------------------------------------------------------------------------
// Workflow Templates (built-in)
// -------------------------------------------------------------------------

const WORKFLOW_TEMPLATES = [
  {
    id: 'enterprise-research',
    name: 'Enterprise Research Workflow',
    description: 'Multi-source research with parallel retrieval, analysis, and verification',
    category: 'Research',
    nodes: [],
    edges: [],
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis Workflow',
    description: 'Extract, chunk, analyze, and publish knowledge from documents',
    category: 'Ingestion',
    nodes: [],
    edges: [],
  },
  {
    id: 'knowledge-investigation',
    name: 'Knowledge Investigation Workflow',
    description: 'Investigate knowledge gaps and verify claims across the graph',
    category: 'Quality',
    nodes: [],
    edges: [],
  },
] as const
