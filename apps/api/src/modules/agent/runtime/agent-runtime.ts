/* Agent runtime — the orchestrator.

Responsibilities:
- Initialize execution
- Maintain state
- Invoke planner
- Execute tools
- Request context
- Perform verification
- Produce final answer
- Enforce limits

The runtime NEVER becomes the security boundary.
Authorization is enforced by the tool authorizer and policy engine.
*/

import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutionStatus } from '@contextgraph/types'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IAgentRuntime,
  IAgentPlanner,
  IAgentStateManager,
  IToolExecutor,
  IAgentVerifier,
  IAgentPolicy,
  IInjectionDetector,
  IAgentCostCalculator,
  type AgentExecutionInput,
  type AgentExecutionResult,
  type AgentExecutionStateSnapshot,
  type TraceEntry,
  type ToolExecutionContext,
} from '../domain/agent.interfaces'
import { AgentStateMachine } from '../state/state-machine'
import { AgentEventEmitter, AgentEventType } from '../observability/agent-event-emitter'
import { DEFAULT_AGENT_LIMITS, type AgentLimits } from '../domain/agent.types'
import { uuid } from '../../../common/utils/uuid'

@Injectable()
export class AgentRuntime implements IAgentRuntime {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly stateMachine: AgentStateMachine,
    @Inject(IAgentStateManager) private readonly stateManager: IAgentStateManager,
    @Inject(IAgentPlanner) private readonly planner: IAgentPlanner,
    @Inject(IToolExecutor) private readonly toolExecutor: IToolExecutor,
    @Inject(IAgentVerifier) private readonly verifier: IAgentVerifier,
    @Inject(IAgentPolicy) private readonly policy: IAgentPolicy,
    @Inject(IInjectionDetector) private readonly injectionDetector: IInjectionDetector,
    @Inject(IAgentCostCalculator) private readonly costCalculator: IAgentCostCalculator,
    private readonly events: AgentEventEmitter,
  ) {}

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const executionId = uuid()
    const startTime = performance.now()
    const trace: TraceEntry[] = []

    this.logger.info('Agent execution starting', {
      executionId,
      userId: input.user.id,
      organizationId: input.user.organizationId,
    })

    // 1. Scan user input for injection
    const injectionResult = this.injectionDetector.scanUserInput(input.userRequest)
    if (injectionResult.detected && injectionResult.action === 'BLOCK') {
      this.logger.warn('Prompt injection detected in user input', {
        executionId,
        patterns: injectionResult.patterns,
      })
      return this.buildResult(
        executionId,
        AgentExecutionStatus.POLICY_BLOCKED,
        startTime,
        trace,
        'Prompt injection detected in user input',
      )
    }

    // 2. Get agent capabilities from policy
    const capabilities = await this.policy.getCapabilities({
      userId: input.user.id,
      organizationId: input.user.organizationId,
      userRole: input.user.role,
      userPermissionLevel: input.user.permissionLevel,
    })

    const limits: AgentLimits = {
      ...DEFAULT_AGENT_LIMITS,
      maxIterations: capabilities.maxIterations,
      maxToolCalls: capabilities.maxToolCalls,
      maxTokens: capabilities.maxTokens,
      maxCost: capabilities.maxCost,
      maxDurationMs: capabilities.maxDurationMs,
    }

    // 3. Initialize state
    const state = await this.stateManager.create({
      executionId,
      userId: input.user.id,
      organizationId: input.user.organizationId,
      workspaceId: input.workspaceId,
      userRequest: input.userRequest,
      config: limits,
    })

    trace.push({
      timestamp: new Date().toISOString(),
      eventType: 'EXECUTION_STARTED',
      summary: 'Agent execution initialized',
      stepIndex: null,
      metadata: { executionId },
    })
    this.events.emit(executionId, AgentEventType.EXECUTION_STARTED, {
      userRequest: input.userRequest,
      organizationId: input.user.organizationId,
    })

    // 4. Create plan
    await this.safeTransition(state, AgentExecutionStatus.PLANNING, trace)

    const toolContext: ToolExecutionContext = {
      executionId,
      userId: input.user.id,
      organizationId: input.user.organizationId,
      workspaceId: input.workspaceId,
    }

    const toolNames =
      capabilities.allowedTools.length > 0
        ? capabilities.allowedTools
        : ['context_search', 'graph_explore', 'knowledge_lookup', 'policy_check', 'calculator']

    const toolSchemasForPlanner: readonly { name: string; description: string }[] = toolNames.map(
      (name) => ({
        name,
        description: '',
      }),
    )

    const plan = await this.planner.createPlan(input.userRequest, toolSchemasForPlanner, limits, {
      iteration: 0,
      completedSteps: [],
      observations: [],
    })

    trace.push({
      timestamp: new Date().toISOString(),
      eventType: 'PLAN_CREATED',
      summary: `Plan created with ${plan.steps.length} steps`,
      stepIndex: null,
      metadata: { planId: plan.planId, stepCount: plan.steps.length },
    })
    this.events.emit(executionId, AgentEventType.PLAN_CREATED, {
      planId: plan.planId,
      stepCount: plan.steps.length,
      steps: plan.steps.map((s) => ({ type: s.type, purpose: s.purpose, tool: s.tool })),
    })

    // 5. Execute the agent loop
    let currentStepIndex = 0
    let iterationCount = 0
    let toolCallCount = 0
    const totalInputTokens = 0
    const totalOutputTokens = 0
    const totalCost = 0
    const observations: { toolName: string; summary: string; data: Record<string, unknown> }[] = []
    const toolResults: { toolName: string; success: boolean; summary: string }[] = []
    let finalResponse = ''
    let lastError: string | null = null

    try {
      while (currentStepIndex < plan.steps.length) {
        // Check hard limits
        const elapsed = performance.now() - startTime
        if (elapsed > limits.maxDurationMs) {
          this.logger.warn('Agent execution timeout', { executionId, elapsed })
          await this.safeTransition(state, AgentExecutionStatus.TIMEOUT, trace)
          lastError = `Execution timed out after ${Math.round(elapsed)}ms`
          break
        }
        if (iterationCount >= limits.maxIterations) {
          this.logger.warn('Max iterations reached', { executionId, iterationCount })
          lastError = `Max iterations (${limits.maxIterations}) reached`
          break
        }
        if (toolCallCount >= limits.maxToolCalls) {
          this.logger.warn('Max tool calls reached', { executionId, toolCallCount })
          lastError = `Max tool calls (${limits.maxToolCalls}) reached`
          break
        }

        iterationCount++
        const step = plan.steps[currentStepIndex]
        if (step === undefined) break

        trace.push({
          timestamp: new Date().toISOString(),
          eventType: `STEP_${step.type}`,
          summary: step.purpose,
          stepIndex: currentStepIndex,
          metadata: { stepId: step.stepId, tool: step.tool },
        })
        this.events.emit(executionId, AgentEventType.STEP_STARTED, {
          stepIndex: currentStepIndex,
          stepType: step.type,
          purpose: step.purpose,
          tool: step.tool,
        })

        switch (step.type) {
          case 'CONTEXT_REQUEST':
          case 'TOOL_CALL': {
            const toolName = step.tool
            if (toolName === null) {
              lastError = `Step ${currentStepIndex} has type ${step.type} but no tool specified`
              await this.safeTransition(state, AgentExecutionStatus.FAILED, trace)
              break
            }

            // Check cost budget
            if (!this.costCalculator.checkBudget(totalCost, limits.maxCost)) {
              lastError = `Cost budget exceeded: $${totalCost.toFixed(4)} > $${limits.maxCost}`
              await this.safeTransition(state, AgentExecutionStatus.FAILED, trace)
              break
            }

            await this.safeTransition(state, AgentExecutionStatus.EXECUTING_TOOL, trace)

            await this.stateManager.updateStep(executionId, currentStepIndex, {
              status: 'IN_PROGRESS',
            })

            this.events.emit(executionId, AgentEventType.TOOL_STARTED, {
              toolName,
              input: step.inputs,
            })

            const toolResult = await this.toolExecutor.execute(
              toolName,
              step.inputs as Record<string, unknown>,
              toolContext,
            )

            toolCallCount++
            toolResults.push({
              toolName,
              success: toolResult.success,
              summary: toolResult.summary,
            })

            await this.stateManager.addToolCall(executionId, {
              toolName,
              input: step.inputs as Record<string, unknown>,
              output: toolResult.data,
              status: toolResult.success ? 'COMPLETED' : 'FAILED',
              policyDecision: null,
              durationMs: toolResult.durationMs,
              failureReason: toolResult.error,
            })

            const observation = {
              toolName,
              summary: toolResult.summary,
              data: toolResult.data ?? {},
            }
            observations.push(observation)
            await this.stateManager.addObservation(executionId, observation)

            // Scan tool output for injection
            if (toolResult.data !== null) {
              const outputStr = JSON.stringify(toolResult.data)
              const injectionCheck = this.injectionDetector.scanToolOutput(toolName, outputStr)
              if (injectionCheck.detected && injectionCheck.action === 'BLOCK') {
                this.logger.warn('Injection detected in tool output', {
                  executionId,
                  tool: toolName,
                  patterns: injectionCheck.patterns,
                })
                observation.summary = `[BLOCKED: potential injection in ${toolName} output]`
                this.events.emit(executionId, AgentEventType.INJECTION_DETECTED, {
                  toolName,
                  patterns: injectionCheck.patterns,
                  action: injectionCheck.action,
                })
              }
            }

            trace.push({
              timestamp: new Date().toISOString(),
              eventType: 'TOOL_COMPLETED',
              summary: `${toolName}: ${toolResult.summary}`,
              stepIndex: currentStepIndex,
              metadata: {
                toolName,
                success: toolResult.success,
                durationMs: toolResult.durationMs,
              },
            })
            this.events.emit(executionId, AgentEventType.TOOL_COMPLETED, {
              toolName,
              success: toolResult.success,
              summary: toolResult.summary,
              durationMs: toolResult.durationMs,
            })

            await this.safeTransition(state, AgentExecutionStatus.OBSERVING, trace)
            await this.stateManager.updateStep(executionId, currentStepIndex, {
              status: 'COMPLETED',
              output: { toolResult: toolResult.summary },
              durationMs: toolResult.durationMs,
            })

            break
          }

          case 'ANALYSIS': {
            await this.safeTransition(state, AgentExecutionStatus.OBSERVING, trace)

            finalResponse = this.buildAnalysisSummary(input.userRequest, observations)

            trace.push({
              timestamp: new Date().toISOString(),
              eventType: 'ANALYSIS_COMPLETE',
              summary: `Analysis complete: ${observations.length} observations synthesized`,
              stepIndex: currentStepIndex,
              metadata: { observationCount: observations.length },
            })

            await this.stateManager.updateStep(executionId, currentStepIndex, {
              status: 'COMPLETED',
              output: { analysisLength: finalResponse.length },
            })

            break
          }

          case 'VERIFICATION': {
            await this.safeTransition(state, AgentExecutionStatus.VERIFYING, trace)

            const verificationResult = await this.verifier.verify({
              executionId,
              finalResponse,
              toolResults,
              userRequest: input.userRequest,
              organizationId: input.user.organizationId,
            })

            await this.stateManager.addVerification(executionId, {
              checkType: 'post_generation',
              status: verificationResult.passed ? 'PASSED' : 'FAILED',
              details: {
                checksCount: verificationResult.checks.length,
                warnings: verificationResult.warnings,
              },
            })

            trace.push({
              timestamp: new Date().toISOString(),
              eventType: verificationResult.passed ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED',
              summary: `Verification ${verificationResult.passed ? 'passed' : 'failed'}: ${verificationResult.checks.length} checks`,
              stepIndex: currentStepIndex,
              metadata: {
                passed: verificationResult.passed,
                checks: verificationResult.checks.map((c) => ({ name: c.name, passed: c.passed })),
              },
            })
            this.events.emit(executionId, AgentEventType.VERIFICATION, {
              passed: verificationResult.passed,
              checksCount: verificationResult.checks.length,
              checks: verificationResult.checks.map((c) => ({ name: c.name, passed: c.passed })),
            })

            if (!verificationResult.passed) {
              lastError = `Verification failed: ${verificationResult.checks
                .filter((c) => !c.passed)
                .map((c) => c.name)
                .join(', ')}`
            }

            await this.stateManager.updateStep(executionId, currentStepIndex, {
              status: 'COMPLETED',
              output: { verificationPassed: verificationResult.passed },
            })

            break
          }

          case 'FINAL_RESPONSE': {
            await this.safeTransition(state, AgentExecutionStatus.GENERATING_RESPONSE, trace)

            trace.push({
              timestamp: new Date().toISOString(),
              eventType: 'FINAL_RESPONSE_READY',
              summary: `Final response ready: ${finalResponse.length} chars`,
              stepIndex: currentStepIndex,
              metadata: { responseLength: finalResponse.length },
            })

            await this.stateManager.updateStep(executionId, currentStepIndex, {
              status: 'COMPLETED',
              output: { responseLength: finalResponse.length },
            })

            break
          }
        }

        if (lastError !== null) break
        currentStepIndex++
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown execution error'
      this.logger.error('Agent execution error', { executionId, error: lastError })
      this.events.emit(executionId, AgentEventType.EXECUTION_FAILED, {
        error: lastError,
      })
      try {
        await this.safeTransition(state, AgentExecutionStatus.FAILED, trace)
      } catch {
        // State may already be in a terminal state
      }
    }

    // 6. Determine final status
    let finalStatus: AgentExecutionStatus
    if (lastError !== null) {
      finalStatus = AgentExecutionStatus.FAILED
    } else if (currentStepIndex >= plan.steps.length) {
      finalStatus = AgentExecutionStatus.COMPLETED
    } else {
      finalStatus = state.status
    }

    if (finalStatus === AgentExecutionStatus.COMPLETED && finalResponse === '') {
      finalStatus = AgentExecutionStatus.FAILED
      lastError = 'No response generated'
    }

    // 7. Finalize
    const durationMs = performance.now() - startTime
    await this.stateManager.finalize(executionId, {
      status: finalStatus,
      finalResponse: finalResponse || undefined,
      errorMessage: lastError ?? undefined,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost: totalCost,
    })

    trace.push({
      timestamp: new Date().toISOString(),
      eventType: 'EXECUTION_COMPLETE',
      summary: `Execution ${finalStatus}: ${durationMs.toFixed(0)}ms, ${toolCallCount} tool calls`,
      stepIndex: null,
      metadata: { status: finalStatus, durationMs, toolCallCount, iterationCount },
    })

    this.logger.info('Agent execution complete', {
      executionId,
      status: finalStatus,
      durationMs,
      iterationCount,
      toolCallCount,
    })

    // Emit final event and complete the stream
    const eventType =
      finalStatus === AgentExecutionStatus.COMPLETED
        ? AgentEventType.EXECUTION_COMPLETE
        : AgentEventType.EXECUTION_FAILED
    this.events.emit(executionId, eventType, {
      status: finalStatus,
      finalResponse: finalResponse || null,
      error: lastError,
      durationMs,
      toolCallCount,
      iterationCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCost: totalCost,
    })
    this.events.complete(executionId)

    return this.buildResult(
      executionId,
      finalStatus,
      startTime,
      trace,
      lastError,
      finalResponse,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      toolCallCount,
      iterationCount,
    )
  }

  async getState(executionId: string): Promise<AgentExecutionStateSnapshot | null> {
    const state = await this.stateManager.get(executionId)
    if (state === null) return null
    return {
      executionId: state.executionId,
      status: state.status,
      currentStepIndex: state.currentStepIndex,
      iterationCount: state.iterationCount,
      toolCallCount: state.toolCallCount,
    }
  }

  private async safeTransition(
    state: { status: AgentExecutionStatus; executionId: string },
    newStatus: AgentExecutionStatus,
    _trace: TraceEntry[],
  ): Promise<void> {
    const result = this.stateMachine.canTransition(state.status, newStatus)
    if (result.valid) {
      await this.stateManager.transition(state.executionId, newStatus)
      state.status = newStatus
    } else {
      this.logger.warn('Skipped invalid transition', {
        from: state.status,
        to: newStatus,
        error: result.error,
      })
    }
  }

  private buildAnalysisSummary(
    userRequest: string,
    observations: readonly { toolName: string; summary: string; data: Record<string, unknown> }[],
  ): string {
    if (observations.length === 0) {
      return `Based on your request "${userRequest}", I was unable to retrieve sufficient context from the knowledge base to provide a comprehensive answer. The system's authorization controls may be limiting available information, or the requested information may not exist in the current knowledge graph.`
    }

    const summaries = observations.map((o) => `- ${o.toolName}: ${o.summary}`).join('\n')

    return `Based on the information retrieved from ContextGraph:\n\n${summaries}\n\nThis response is grounded in authorized context retrieved through the ContextGraph platform.`
  }

  private buildResult(
    executionId: string,
    status: AgentExecutionStatus,
    startTime: number,
    trace: TraceEntry[],
    error: string | null = null,
    finalResponse = '',
    inputTokens = 0,
    outputTokens = 0,
    cost = 0,
    toolCalls = 0,
    iterations = 0,
  ): AgentExecutionResult {
    return {
      executionId,
      status,
      finalResponse: finalResponse || null,
      iterations,
      toolCalls,
      inputTokens,
      outputTokens,
      estimatedCost: cost,
      durationMs: performance.now() - startTime,
      trace,
      error,
    }
  }
}
