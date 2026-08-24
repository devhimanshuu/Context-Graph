/* Workflow Runtime — orchestrates DAG-based workflow execution.

The runtime is the central orchestrator. It:
  1. Validates the workflow DAG
  2. Initializes execution state
  3. Schedules ready nodes
  4. Delegates to node handlers
  5. Manages retries
  6. Creates checkpoints
  7. Handles failures
  8. Enforces limits
  9. Emits events

The runtime NEVER bypasses authorization, ContextGraph, or model gateway.
*/

import { Injectable, Inject } from '@nestjs/common'
import type {
  EntityId,
  Metadata,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowNode,
  WorkflowExecutionPolicy,
  Milliseconds,
} from '@contextgraph/types'
import {
  type IWorkflowRuntime,
  type WorkflowExecutionInput,
  type WorkflowExecutionResult,
  type WorkflowExecutionStateSnapshot,
  type WorkflowTraceEntry,
  type NodeHandlerContext,
  type NodeHandlerResult,
  IWorkflowDefinitionRepository,
  IWorkflowExecutionRepository,
  INodeExecutionRepository,
  IDagValidator,
  IWorkflowScheduler,
  IWorkflowStateMachine,
  IWorkflowRetryManager,
  IWorkflowEventEmitter,
  ICheckpointManager,
  IWorkflowObservability,
} from '../domain/workflow.interfaces'
import { NodeHandlerRegistry } from '../nodes/node-handlers'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { uuid as generateUUIDv7 } from '../../../common/utils/uuid'

@Injectable()
export class WorkflowRuntime implements IWorkflowRuntime {
  private static readonly MAX_SAFETY_ITERATIONS = 500

  constructor(
    @Inject(IWorkflowDefinitionRepository) private readonly defRepo: IWorkflowDefinitionRepository,
    @Inject(IWorkflowExecutionRepository) private readonly execRepo: IWorkflowExecutionRepository,
    @Inject(INodeExecutionRepository) private readonly nodeExecRepo: INodeExecutionRepository,
    @Inject(IDagValidator) private readonly dagValidator: IDagValidator,
    @Inject(IWorkflowScheduler) private readonly scheduler: IWorkflowScheduler,
    @Inject(IWorkflowStateMachine) private readonly stateMachine: IWorkflowStateMachine,
    @Inject(IWorkflowRetryManager) private readonly retryManager: IWorkflowRetryManager,
    @Inject(IWorkflowEventEmitter) private readonly eventEmitter: IWorkflowEventEmitter,
    @Inject(ICheckpointManager) private readonly checkpointManager: ICheckpointManager,
    @Inject(IWorkflowObservability) private readonly observability: IWorkflowObservability,
    private readonly nodeHandlerRegistry: NodeHandlerRegistry,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  // -------------------------------------------------------------------------
  // Execute
  // -------------------------------------------------------------------------

  async execute(input: WorkflowExecutionInput): Promise<WorkflowExecutionResult> {
    const startTime = Date.now()
    const executionId = generateUUIDv7()

    this.logger.info('Workflow execution started', {
      executionId,
      workflowId: input.workflowId,
      organizationId: input.organizationId,
    })

    try {
      // 1. Load and validate workflow definition
      const definition = await this.loadAndValidateWorkflow(input.workflowId)

      // 2. Create execution record
      const execution = await this.createExecution(input, definition, executionId)

      // 3. Emit start event
      this.eventEmitter.emit(executionId, 'WORKFLOW_STARTED', null, {
        workflowId: input.workflowId,
        workflowName: definition.name,
        version: definition.version,
        nodeCount: definition.nodes.length,
      })

      // 4. Initialize node executions (all PENDING)
      await this.initializeNodeExecutions(execution, definition)

      // 5. Create initial checkpoint
      await this.checkpointManager.createCheckpoint(executionId, definition.version, {
        status: 'RUNNING',
        completedNodes: [],
        failedNodes: [],
        currentNodes: this.getEntryNodes(definition),
      })

      // 6. Run the execution loop
      const result = await this.executionLoop(execution, definition)

      // 7. Record observability metrics
      this.observability.recordExecution({
        executionId,
        organizationId: input.organizationId,
        status: result.status,
        durationMs: result.durationMs,
        nodeCount: definition.nodes.length,
        agentCalls: result.trace.filter(
          (t) => t.eventType === 'NODE_STARTED' && t.metadata.nodeType === 'AGENT',
        ).length,
        toolCalls: result.trace.filter((t) => t.metadata.toolName !== undefined).length,
        tokenUsage: result.tokenUsage,
        cost: result.estimatedCost,
        retries: result.trace.filter((t) => t.eventType === 'NODE_RETRIED').length,
        approvalWaits: result.trace.filter((t) => t.eventType === 'APPROVAL_REQUESTED').length,
        timestamp: Date.now(),
      })

      // 8. Complete SSE stream
      this.eventEmitter.complete(executionId)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error'

      this.logger.error('Workflow execution failed', { executionId, error: errorMessage })

      // Update execution status to FAILED
      await this.execRepo.updateStatus(executionId, 'FAILED', {
        error: errorMessage,
        completedAt: new Date().toISOString(),
      })

      this.eventEmitter.emit(executionId, 'WORKFLOW_FAILED', null, { error: errorMessage })
      this.eventEmitter.complete(executionId)

      return {
        executionId,
        status: 'FAILED',
        output: null,
        durationMs: Date.now() - startTime,
        tokenUsage: 0,
        estimatedCost: 0,
        trace: [],
        error: errorMessage,
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pause / Resume / Cancel
  // -------------------------------------------------------------------------

  async pause(executionId: EntityId, userId: EntityId): Promise<void> {
    const execution = await this.execRepo.findById(executionId)
    if (!execution) throw new Error(`Execution ${executionId} not found`)

    const transition = this.stateMachine.canTransitionWorkflow(execution.status, 'PAUSED')
    if (!transition.valid) throw new Error(transition.error)

    await this.execRepo.updateStatus(executionId, 'PAUSED')
    this.eventEmitter.emit(executionId, 'WORKFLOW_PAUSED', null, { pausedBy: userId })
  }

  async resume(executionId: EntityId, userId: EntityId): Promise<void> {
    const execution = await this.execRepo.findById(executionId)
    if (!execution) throw new Error(`Execution ${executionId} not found`)

    const transition = this.stateMachine.canTransitionWorkflow(execution.status, 'RUNNING')
    if (!transition.valid) throw new Error(transition.error)

    await this.execRepo.updateStatus(executionId, 'RUNNING')
    this.eventEmitter.emit(executionId, 'WORKFLOW_RESUMED', null, { resumedBy: userId })
  }

  async cancel(executionId: EntityId, userId: EntityId): Promise<void> {
    const execution = await this.execRepo.findById(executionId)
    if (!execution) throw new Error(`Execution ${executionId} not found`)

    const transition = this.stateMachine.canTransitionWorkflow(execution.status, 'CANCELLED')
    if (!transition.valid) throw new Error(transition.error)

    await this.execRepo.updateStatus(executionId, 'CANCELLED', {
      completedAt: new Date().toISOString(),
    })

    // Cancel any running node executions
    const nodeExecutions = await this.nodeExecRepo.findByExecution(executionId)
    for (const ne of nodeExecutions) {
      if (ne.status === 'RUNNING' || ne.status === 'WAITING') {
        await this.nodeExecRepo.updateStatus(ne.nodeExecutionId, 'CANCELLED')
      }
    }

    this.eventEmitter.emit(executionId, 'WORKFLOW_CANCELLED', null, { cancelledBy: userId })
    this.eventEmitter.complete(executionId)
  }

  async approve(
    executionId: EntityId,
    approvalId: EntityId,
    userId: EntityId,
    approved: boolean,
    note?: string,
  ): Promise<void> {
    // The approval is handled by the approval repository
    // This method is called by the controller when a human responds
    this.eventEmitter.emit(executionId, 'APPROVAL_RESOLVED', null, {
      approvalId,
      approved,
      resolvedBy: userId,
      note,
    })
  }

  async getState(executionId: EntityId): Promise<WorkflowExecutionStateSnapshot | null> {
    const execution = await this.execRepo.findById(executionId)
    if (!execution) return null

    return {
      executionId,
      status: execution.status,
      currentNodes: execution.currentNodes,
      completedNodes: execution.completedNodes,
      failedNodes: execution.failedNodes,
    }
  }

  // -------------------------------------------------------------------------
  // Internal — execution loop
  // -------------------------------------------------------------------------

  private async executionLoop(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now()
    const trace: WorkflowTraceEntry[] = []
    const policy = definition.executionPolicy
    const totalTokens = 0
    const totalCost = 0
    let iterationCount = 0

    const completedNodeIds = new Set<EntityId>(execution.completedNodes)
    const failedNodeIds = new Set<EntityId>(execution.failedNodes)
    const runningNodeIds = new Set<EntityId>()

    while (iterationCount < WorkflowRuntime.MAX_SAFETY_ITERATIONS) {
      iterationCount++

      // Enforce iteration limit
      if (iterationCount >= policy.maxIterations) {
        await this.execRepo.updateStatus(execution.executionId, 'TIMED_OUT', {
          error: `Exceeded maximum iterations: ${policy.maxIterations}`,
          completedAt: new Date().toISOString(),
        })
        this.eventEmitter.emit(execution.executionId, 'WORKFLOW_TIMED_OUT', null, {
          iterations: iterationCount,
        })
        return this.buildResult(
          execution.executionId,
          'TIMED_OUT',
          trace,
          startTime,
          totalTokens,
          totalCost,
        )
      }

      // Enforce duration limit
      if (Date.now() - startTime > policy.maxDurationMs) {
        await this.execRepo.updateStatus(execution.executionId, 'TIMED_OUT', {
          error: `Exceeded maximum duration: ${policy.maxDurationMs}ms`,
          completedAt: new Date().toISOString(),
        })
        return this.buildResult(
          execution.executionId,
          'TIMED_OUT',
          trace,
          startTime,
          totalTokens,
          totalCost,
        )
      }

      // Enforce cost limit
      if (totalCost >= policy.maxCost) {
        await this.execRepo.updateStatus(execution.executionId, 'FAILED', {
          error: `Exceeded maximum cost: $${totalCost.toFixed(4)}`,
          completedAt: new Date().toISOString(),
        })
        return this.buildResult(
          execution.executionId,
          'FAILED',
          trace,
          startTime,
          totalTokens,
          totalCost,
        )
      }

      // Find ready nodes
      const readyNodes = this.scheduler.getReadyNodes(
        execution,
        definition.nodes,
        definition.edges,
        [...completedNodeIds],
        [...failedNodeIds],
        [...runningNodeIds],
      )

      // If no ready nodes and no running nodes, we're done
      if (readyNodes.length === 0 && runningNodeIds.size === 0) {
        const isComplete = this.scheduler.isWorkflowComplete(
          definition.nodes,
          [...completedNodeIds],
          [...failedNodeIds],
        )

        if (isComplete) {
          const outputNode = definition.nodes.find((n) => n.type === 'END')
          const finalOutput = outputNode
            ? this.collectUpstreamOutputs(outputNode, definition, completedNodeIds)
            : {}

          await this.execRepo.updateStatus(execution.executionId, 'COMPLETED', {
            output: finalOutput,
            completedAt: new Date().toISOString(),
          })
          this.eventEmitter.emit(execution.executionId, 'WORKFLOW_COMPLETED', null, {
            output: finalOutput,
          })

          return this.buildResult(
            execution.executionId,
            'COMPLETED',
            trace,
            startTime,
            totalTokens,
            totalCost,
          )
        }

        // Check for paused or waiting states
        const latestExec = await this.execRepo.findById(execution.executionId)
        if (
          latestExec &&
          (latestExec.status === 'PAUSED' || latestExec.status === 'WAITING_FOR_APPROVAL')
        ) {
          // Wait for external action
          await this.sleep(1000)
          continue
        }

        // If there are failed nodes but workflow hasn't failed, something is stuck
        if (failedNodeIds.size > 0) {
          await this.execRepo.updateStatus(execution.executionId, 'FAILED', {
            error: `Workflow stuck with ${failedNodeIds.size} failed nodes and no ready nodes`,
            completedAt: new Date().toISOString(),
          })
          return this.buildResult(
            execution.executionId,
            'FAILED',
            trace,
            startTime,
            totalTokens,
            totalCost,
          )
        }
      }

      // Enforce parallelism limit
      const nodesToExecute = readyNodes.slice(0, policy.maxParallelNodes)

      // Execute each ready node
      for (const node of nodesToExecute) {
        // Check tool/agent call limits
        if (node.type === 'AGENT' || node.type === 'TOOL') {
          const currentAgentCalls = trace.filter((t) => t.metadata.nodeType === 'AGENT').length
          const currentToolCalls = trace.filter((t) => t.metadata.toolName !== undefined).length

          if (node.type === 'AGENT' && currentAgentCalls >= policy.maxAgentCalls) {
            this.logger.warn('Agent call limit reached', { executionId: execution.executionId })
            continue
          }
          if (node.type === 'TOOL' && currentToolCalls >= policy.maxToolCalls) {
            this.logger.warn('Tool call limit reached', { executionId: execution.executionId })
            continue
          }
        }

        // Execute node asynchronously (but we await each in sequence for now)
        await this.executeNode(
          execution,
          definition,
          node,
          trace,
          completedNodeIds,
          failedNodeIds,
          runningNodeIds,
          { totalTokens, totalCost },
          policy,
        )

        // Reload execution state after each node
        const refreshed = await this.execRepo.findById(execution.executionId)
        if (refreshed) {
          execution = refreshed
        }
      }
    }

    // Safety limit reached
    await this.execRepo.updateStatus(execution.executionId, 'FAILED', {
      error: 'Safety iteration limit reached',
      completedAt: new Date().toISOString(),
    })

    return this.buildResult(
      execution.executionId,
      'FAILED',
      trace,
      startTime,
      totalTokens,
      totalCost,
    )
  }

  // -------------------------------------------------------------------------
  // Internal — node execution
  // -------------------------------------------------------------------------

  private async executeNode(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
    node: WorkflowNode,
    trace: WorkflowTraceEntry[],
    completedNodeIds: Set<EntityId>,
    failedNodeIds: Set<EntityId>,
    runningNodeIds: Set<EntityId>,
    _counters: { totalTokens: number; totalCost: number },
    _policy: WorkflowExecutionPolicy,
  ): Promise<void> {
    const nodeHandler = this.nodeHandlerRegistry.getHandler(node.type)
    if (!nodeHandler) {
      this.logger.error('No handler for node type', { nodeType: node.type, nodeId: node.nodeId })
      failedNodeIds.add(node.nodeId)
      return
    }

    // Create node execution record
    const nodeExecution = await this.nodeExecRepo.create({
      nodeExecutionId: generateUUIDv7(),
      executionId: execution.executionId,
      nodeId: node.nodeId,
      nodeName: node.name,
      nodeType: node.type,
      maxAttempts: node.retryPolicy.maxAttempts,
      input: this.collectUpstreamOutputs(node, definition, completedNodeIds),
    })

    runningNodeIds.add(node.nodeId)

    // Emit node started event
    trace.push({
      timestamp: new Date().toISOString(),
      eventType: 'NODE_STARTED',
      nodeId: node.nodeId,
      nodeName: node.name,
      summary: `Executing ${node.type} node: ${node.name}`,
      metadata: { nodeType: node.type },
    })
    this.eventEmitter.emit(execution.executionId, 'NODE_STARTED', node.nodeId, {
      nodeName: node.name,
      nodeType: node.type,
    })

    // Build handler context
    const context: NodeHandlerContext = {
      executionId: execution.executionId,
      organizationId: execution.organizationId,
      userId: execution.userId,
      workspaceId: execution.workspaceId,
      workflowInput: execution.input,
      upstreamOutputs: this.collectUpstreamOutputs(node, definition, completedNodeIds),
      checkpointManager: this.checkpointManager,
    }

    // Execute with retry
    let attempt = 0
    let result: NodeHandlerResult | null = null
    const retryPolicy = node.retryPolicy

    while (attempt < retryPolicy.maxAttempts) {
      attempt++

      try {
        await this.nodeExecRepo.updateStatus(nodeExecution.nodeExecutionId, 'RUNNING')
        const startTime = Date.now()

        result = await nodeHandler.execute(nodeExecution, node, context)

        const durationMs = Date.now() - startTime

        if (result.success) {
          await this.nodeExecRepo.updateStatus(nodeExecution.nodeExecutionId, 'COMPLETED', {
            output: result.output,
            completedAt: new Date().toISOString(),
            durationMs,
          })
          break
        } else {
          // Check if we should retry
          const retryDecision = this.retryManager.shouldRetry(
            retryPolicy,
            attempt,
            result.error ?? '',
          )
          if (retryDecision.shouldRetry) {
            trace.push({
              timestamp: new Date().toISOString(),
              eventType: 'NODE_RETRIED',
              nodeId: node.nodeId,
              nodeName: node.name,
              summary: `Retrying ${node.name} (attempt ${attempt + 1}) after ${retryDecision.delayMs}ms`,
              metadata: { attempt, delayMs: retryDecision.delayMs, error: result.error },
            })
            this.eventEmitter.emit(execution.executionId, 'NODE_RETRIED', node.nodeId, {
              attempt: attempt + 1,
              delayMs: retryDecision.delayMs,
            })
            await this.sleep(retryDecision.delayMs)
            await this.nodeExecRepo.incrementAttempt(nodeExecution.nodeExecutionId)
            continue
          }

          // No more retries — apply failure policy
          await this.applyFailurePolicy(
            node,
            execution,
            result,
            trace,
            failedNodeIds,
            runningNodeIds,
            completedNodeIds,
          )
          break
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result = { success: false, output: null, error: errorMessage }

        const retryDecision = this.retryManager.shouldRetry(retryPolicy, attempt, errorMessage)
        if (retryDecision.shouldRetry) {
          await this.sleep(retryDecision.delayMs)
          await this.nodeExecRepo.incrementAttempt(nodeExecution.nodeExecutionId)
          continue
        }

        await this.applyFailurePolicy(
          node,
          execution,
          result,
          trace,
          failedNodeIds,
          runningNodeIds,
          completedNodeIds,
        )
        break
      }
    }

    runningNodeIds.delete(node.nodeId)

    // Handle success
    if (result?.success) {
      completedNodeIds.add(node.nodeId)

      trace.push({
        timestamp: new Date().toISOString(),
        eventType: 'NODE_COMPLETED',
        nodeId: node.nodeId,
        nodeName: node.name,
        summary: this.summarizeNodeResult(node, result),
        metadata: { durationMs: (result.output?._durationMs as number) ?? 0 },
      })
      this.eventEmitter.emit(execution.executionId, 'NODE_COMPLETED', node.nodeId, {
        nodeName: node.name,
        summary: this.summarizeNodeResult(node, result),
      })

      // Create checkpoint after important nodes
      if (node.type === 'AGENT' || node.type === 'MERGE' || node.type === 'END') {
        await this.checkpointManager.createCheckpoint(execution.executionId, definition.version, {
          status: 'RUNNING',
          completedNodes: [...completedNodeIds],
          failedNodes: [...failedNodeIds],
        })
      }
    }
  }

  // -------------------------------------------------------------------------
  // Internal — failure policy
  // -------------------------------------------------------------------------

  private async applyFailurePolicy(
    node: WorkflowNode,
    execution: WorkflowExecution,
    result: NodeHandlerResult,
    trace: WorkflowTraceEntry[],
    failedNodeIds: Set<EntityId>,
    runningNodeIds: Set<EntityId>,
    completedNodeIds: Set<EntityId>,
  ): Promise<void> {
    runningNodeIds.delete(node.nodeId)

    switch (node.failurePolicy) {
      case 'FAIL_WORKFLOW':
        failedNodeIds.add(node.nodeId)
        await this.execRepo.updateStatus(execution.executionId, 'FAILED', {
          error: `Node ${node.name} failed: ${result.error}`,
          completedAt: new Date().toISOString(),
        })
        trace.push({
          timestamp: new Date().toISOString(),
          eventType: 'NODE_FAILED',
          nodeId: node.nodeId,
          nodeName: node.name,
          summary: `Node ${node.name} failed (FAIL_WORKFLOW): ${result.error}`,
          metadata: { error: result.error, failurePolicy: 'FAIL_WORKFLOW' },
        })
        this.eventEmitter.emit(execution.executionId, 'NODE_FAILED', node.nodeId, {
          nodeName: node.name,
          error: result.error,
          failurePolicy: 'FAIL_WORKFLOW',
        })
        break

      case 'SKIP_NODE':
        completedNodeIds.add(node.nodeId) // Treat as completed with null output
        trace.push({
          timestamp: new Date().toISOString(),
          eventType: 'NODE_SKIPPED',
          nodeId: node.nodeId,
          nodeName: node.name,
          summary: `Node ${node.name} skipped due to failure`,
          metadata: { error: result.error },
        })
        this.eventEmitter.emit(execution.executionId, 'NODE_SKIPPED', node.nodeId, {
          nodeName: node.name,
          reason: result.error,
        })
        break

      case 'CONTINUE_WITH_PARTIAL':
        completedNodeIds.add(node.nodeId)
        trace.push({
          timestamp: new Date().toISOString(),
          eventType: 'NODE_COMPLETED',
          nodeId: node.nodeId,
          nodeName: node.name,
          summary: `Node ${node.name} completed with partial result`,
          metadata: { partial: true, error: result.error },
        })
        break

      case 'WAIT_FOR_HUMAN':
        failedNodeIds.add(node.nodeId)
        await this.execRepo.updateStatus(execution.executionId, 'WAITING_FOR_APPROVAL', {
          error: `Node ${node.name} requires human intervention: ${result.error}`,
        })
        trace.push({
          timestamp: new Date().toISOString(),
          eventType: 'APPROVAL_REQUESTED',
          nodeId: node.nodeId,
          nodeName: node.name,
          summary: `Node ${node.name} requires human approval: ${result.error}`,
          metadata: { error: result.error },
        })
        this.eventEmitter.emit(execution.executionId, 'APPROVAL_REQUESTED', node.nodeId, {
          nodeName: node.name,
          reason: result.error,
        })
        break

      default:
        // RETRY_NODE is handled by the retry loop — should not reach here
        failedNodeIds.add(node.nodeId)
        break
    }
  }

  // -------------------------------------------------------------------------
  // Internal — helpers
  // -------------------------------------------------------------------------

  private async loadAndValidateWorkflow(workflowId: EntityId): Promise<WorkflowDefinition> {
    const definition = await this.defRepo.findById(workflowId)
    if (!definition) {
      throw new Error(`Workflow definition not found: ${workflowId}`)
    }

    if (definition.status !== 'PUBLISHED') {
      throw new Error(`Workflow must be PUBLISHED to execute (current: ${definition.status})`)
    }

    // Validate DAG
    const validationResult = this.dagValidator.validate(definition.nodes, definition.edges)
    if (!validationResult.valid) {
      throw new Error(
        `Invalid workflow DAG: ${validationResult.errors.map((e) => e.message).join('; ')}`,
      )
    }

    return definition
  }

  private async createExecution(
    input: WorkflowExecutionInput,
    definition: WorkflowDefinition,
    executionId: EntityId,
  ): Promise<WorkflowExecution> {
    return this.execRepo.create({
      executionId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      workflowVersion: definition.version,
      userId: input.userId,
      input: input.input,
    })
  }

  private async initializeNodeExecutions(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
  ): Promise<void> {
    // Create PENDING node executions for all nodes
    for (const node of definition.nodes) {
      await this.nodeExecRepo.create({
        nodeExecutionId: generateUUIDv7(),
        executionId: execution.executionId,
        nodeId: node.nodeId,
        nodeName: node.name,
        nodeType: node.type,
        maxAttempts: node.retryPolicy.maxAttempts,
        input: {},
      })
    }
  }

  private getEntryNodes(definition: WorkflowDefinition): EntityId[] {
    const hasIncoming = new Set<EntityId>()

    for (const edge of definition.edges) {
      hasIncoming.add(edge.targetNodeId)
    }

    return definition.nodes
      .filter((n) => !hasIncoming.has(n.nodeId) || n.type === 'START')
      .map((n) => n.nodeId)
  }

  private collectUpstreamOutputs(
    node: WorkflowNode,
    definition: WorkflowDefinition,
    completedNodeIds: Set<EntityId>,
  ): Metadata {
    const outputs: Metadata = {}
    const incomingEdges = definition.edges.filter((e) => e.targetNodeId === node.nodeId)

    for (const edge of incomingEdges) {
      if (completedNodeIds.has(edge.sourceNodeId)) {
        // In production, we'd load the actual node output from the repository
        // For now, use a placeholder that the node can work with
        outputs[edge.sourceNodeId] = { completed: true }
      }
    }

    return outputs
  }

  private summarizeNodeResult(node: WorkflowNode, result: NodeHandlerResult): string {
    if (!result.output) return `${node.name} completed with no output`

    if (result.output._requiresAgentExecution) {
      return `Agent ${node.name} queued for execution`
    }
    if (result.output._requiresContextRetrieval) {
      return `Context request from ${node.name} queued`
    }
    if (result.output._requiresToolExecution) {
      return `Tool ${result.output.toolName as string} from ${node.name} queued`
    }
    if (result.output._requiresApproval) {
      return `${node.name} requires human approval`
    }

    return `${node.name} completed successfully`
  }

  private buildResult(
    executionId: EntityId,
    status: WorkflowExecutionStatus,
    trace: WorkflowTraceEntry[],
    startTime: number,
    tokenUsage: number,
    estimatedCost: number,
  ): WorkflowExecutionResult {
    return {
      executionId,
      status,
      output: null, // Loaded from DB
      durationMs: Date.now() - startTime,
      tokenUsage,
      estimatedCost,
      trace,
      error: null,
    }
  }

  private sleep(ms: Milliseconds): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
