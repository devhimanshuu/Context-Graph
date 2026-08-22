/* Tool executor — full validation → authorization → execution lifecycle. */

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IToolExecutor,
  IToolRegistry,
  IToolAuthorizer,
  IToolInputValidator,
  ILoopDetector,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from '../domain/agent.interfaces'
import { DEFAULT_AGENT_LIMITS } from '../domain/agent.types'

/**
 * The tool executor runs the complete lifecycle:
 * 1. Validate tool exists and is registered
 * 2. Validate input schema
 * 3. Authorize the call
 * 4. Detect loops
 * 5. Execute the tool
 *
 * Authorization ALWAYS happens before execution.
 */
@Injectable()
export class ToolExecutor implements IToolExecutor {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IToolRegistry) private readonly registry: IToolRegistry,
    @Inject(IToolAuthorizer) private readonly authorizer: IToolAuthorizer,
    @Inject(IToolInputValidator) private readonly validator: IToolInputValidator,
    @Inject(ILoopDetector) private readonly loopDetector: ILoopDetector,
  ) {}

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now()

    // 1. Check tool exists
    const registration = this.registry.get(toolName)
    if (registration === undefined) {
      this.logger.warn('Tool not found', { toolName, executionId: context.executionId })
      return {
        success: false,
        data: null,
        summary: `Tool '${toolName}' not found`,
        error: `Tool '${toolName}' is not registered`,
        durationMs: performance.now() - startTime,
      }
    }

    // 2. Validate input
    let validatedInput: Record<string, unknown>
    try {
      validatedInput = this.validator.validate(toolName, input, registration.schema)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed'
      this.logger.warn('Tool input validation failed', {
        toolName,
        error: message,
        executionId: context.executionId,
      })
      return {
        success: false,
        data: null,
        summary: `Input validation failed for '${toolName}'`,
        error: message,
        durationMs: performance.now() - startTime,
      }
    }

    // 3. Check for loops
    if (
      this.loopDetector.isLooping(
        toolName,
        validatedInput,
        DEFAULT_AGENT_LIMITS.maxConsecutiveIdenticalCalls,
      )
    ) {
      this.logger.warn('Tool loop detected', { toolName, executionId: context.executionId })
      return {
        success: false,
        data: null,
        summary: `Repeated identical call to '${toolName}' detected`,
        error: 'Loop detected: identical tool call repeated too many times',
        durationMs: performance.now() - startTime,
      }
    }

    // 4. Authorize
    const authDecision = await this.authorizer.authorize(
      registration.schema,
      context,
      validatedInput,
    )
    if (!authDecision.allowed) {
      this.logger.warn('Tool authorization denied', {
        toolName,
        reason: authDecision.reason,
        executionId: context.executionId,
      })
      return {
        success: false,
        data: null,
        summary: `Authorization denied for '${toolName}': ${authDecision.reason}`,
        error: authDecision.reason ?? 'Authorization denied',
        durationMs: performance.now() - startTime,
      }
    }

    // 5. Record for loop detection
    this.loopDetector.record(toolName, validatedInput)

    // 6. Execute
    try {
      this.logger.debug('Tool executing', { toolName, executionId: context.executionId })
      const result = await registration.execute(validatedInput, context)
      const durationMs = performance.now() - startTime

      this.logger.debug('Tool executed', {
        toolName,
        success: result.success,
        durationMs,
        executionId: context.executionId,
      })

      return { ...result, durationMs }
    } catch (error) {
      const durationMs = performance.now() - startTime
      const message = error instanceof Error ? error.message : 'Tool execution failed'

      this.logger.error('Tool execution error', {
        toolName,
        error: message,
        executionId: context.executionId,
      })

      return {
        success: false,
        data: null,
        summary: `Tool '${toolName}' execution failed`,
        error: message,
        durationMs,
      }
    }
  }
}
