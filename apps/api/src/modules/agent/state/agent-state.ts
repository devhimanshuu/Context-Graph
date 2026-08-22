/* Agent state manager — manages state transitions and persists state changes. */

import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutionStatus } from '@contextgraph/types'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import { AgentStateMachine } from './state-machine'
import {
  IAgentStateManager,
  IAgentExecutionRepository,
  type AgentStateData,
  type CreateStateInput,
  type ObservationData,
  type ToolCallData,
  type VerificationData,
  type FinalizationInput,
  type StepUpdates,
} from '../domain/agent.interfaces'
import { uuid } from '../../../common/utils/uuid'

@Injectable()
export class AgentStateManager implements IAgentStateManager {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly stateMachine: AgentStateMachine,
    @Inject(IAgentExecutionRepository) private readonly repository: IAgentExecutionRepository,
  ) {}

  async create(input: CreateStateInput): Promise<AgentStateData> {
    await this.repository.create({
      executionId: input.executionId,
      userId: input.userId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      userRequest: input.userRequest,
      config: input.config as unknown as Record<string, unknown>,
    })

    await this.repository.updateStatus(input.executionId, AgentExecutionStatus.INITIALIZING)

    this.logger.info('Agent state created', { executionId: input.executionId })

    return {
      executionId: input.executionId,
      userId: input.userId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      userRequest: input.userRequest,
      status: AgentExecutionStatus.INITIALIZING,
      currentStepIndex: 0,
      iterationCount: 0,
      toolCallCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      finalResponse: null,
      errorMessage: null,
      observations: [],
      config: input.config,
    }
  }

  async transition(executionId: string, newStatus: AgentExecutionStatus): Promise<void> {
    const record = await this.repository.findById(executionId)
    if (record === null) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    const transitionResult = this.stateMachine.canTransition(record.status, newStatus)
    if (!transitionResult.valid) {
      this.logger.warn('Invalid state transition rejected', {
        executionId,
        from: record.status,
        to: newStatus,
        error: transitionResult.error,
      })
      throw new Error(transitionResult.error)
    }

    const isTerminal = this.stateMachine.isTerminal(newStatus)
    await this.repository.updateStatus(
      executionId,
      newStatus,
      isTerminal ? { finalResponse: undefined, errorMessage: undefined } : undefined,
    )

    this.logger.debug('Agent state transition', {
      executionId,
      from: record.status,
      to: newStatus,
    })
  }

  async updateStep(executionId: string, stepIndex: number, updates: StepUpdates): Promise<void> {
    // Find the step by execution and index from steps
    const steps = await this.repository.getSteps(executionId)
    const step = steps.find((s) => s.stepIndex === stepIndex)
    if (step === undefined) {
      this.logger.warn('Step not found for update', { executionId, stepIndex })
      return
    }

    await this.repository.updateStep(step.stepId, {
      status: updates.status,
      output: updates.output,
      errorMessage: updates.errorMessage,
      durationMs: updates.durationMs,
    })
  }

  async addObservation(executionId: string, observation: ObservationData): Promise<void> {
    const steps = await this.repository.getSteps(executionId)
    const currentStep = steps[steps.length - 1]
    if (currentStep === undefined) {
      this.logger.warn('No step to attach observation to', { executionId })
      return
    }

    await this.repository.addObservation({
      observationId: uuid(),
      executionId,
      stepId: currentStep.stepId,
      toolName: observation.toolName,
      summary: observation.summary,
      data: observation.data,
    })
  }

  async addToolCall(executionId: string, toolCall: ToolCallData): Promise<void> {
    const steps = await this.repository.getSteps(executionId)
    const currentStep = steps[steps.length - 1]
    if (currentStep === undefined) {
      this.logger.warn('No step to attach tool call to', { executionId })
      return
    }

    const toolCallId = uuid()
    await this.repository.addToolCall({
      toolCallId,
      executionId,
      stepId: currentStep.stepId,
      toolName: toolCall.toolName,
      input: toolCall.input,
    })

    await this.repository.updateToolCall(toolCallId, {
      output: toolCall.output,
      status: toolCall.status,
      failureReason: toolCall.failureReason,
      policyDecision: toolCall.policyDecision,
      durationMs: toolCall.durationMs,
    })
  }

  async addVerification(executionId: string, verification: VerificationData): Promise<void> {
    const steps = await this.repository.getSteps(executionId)
    const currentStep = steps[steps.length - 1]
    if (currentStep === undefined) {
      this.logger.warn('No step to attach verification to', { executionId })
      return
    }

    await this.repository.addVerification({
      verificationId: uuid(),
      executionId,
      stepId: currentStep.stepId,
      checkType: verification.checkType,
      status: verification.status,
      details: verification.details,
    })
  }

  async get(executionId: string): Promise<AgentStateData | null> {
    const record = await this.repository.findById(executionId)
    if (record === null) return null

    return {
      executionId: record.executionId,
      userId: record.userId,
      organizationId: record.organizationId,
      workspaceId: record.workspaceId,
      userRequest: record.userRequest,
      status: record.status,
      currentStepIndex: record.currentStepIndex,
      iterationCount: record.iterationCount,
      toolCallCount: record.toolCallCount,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      estimatedCost: record.estimatedCost,
      finalResponse: record.finalResponse,
      errorMessage: record.errorMessage,
      observations: [],
      config: (record.metadata ?? {}) as unknown as AgentStateData['config'],
    }
  }

  async finalize(executionId: string, result: FinalizationInput): Promise<void> {
    await this.repository.updateStatus(executionId, result.status, {
      finalResponse: result.finalResponse ?? null,
      errorMessage: result.errorMessage ?? null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: result.estimatedCost,
    })

    this.logger.info('Agent execution finalized', {
      executionId,
      status: result.status,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: result.estimatedCost,
    })
  }
}
