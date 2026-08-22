/* Tool authorizer — checks tool permissions and policies before execution. */

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IToolAuthorizer,
  IAgentPolicy,
  type ToolExecutionContext,
  type ToolAuthorizationDecision,
} from '../domain/agent.interfaces'
import type { ToolSchema } from '../domain/agent.types'

/**
 * The tool authorizer validates that:
 * 1. The tool exists and is enabled
 * 2. The user has the required capabilities for the tool
 * 3. The tool's risk level is acceptable
 * 4. The organization context is valid
 *
 * Authorization NEVER delegates to the LLM.
 */
@Injectable()
export class ToolAuthorizer implements IToolAuthorizer {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IAgentPolicy) private readonly policy: IAgentPolicy,
  ) {}

  async authorize(
    tool: ToolSchema,
    context: ToolExecutionContext,
    _input: Record<string, unknown>,
  ): Promise<ToolAuthorizationDecision> {
    // 1. Check tool is enabled
    if (!tool.enabled) {
      this.logger.warn('Tool disabled', { toolName: tool.name, executionId: context.executionId })
      return { allowed: false, reason: `Tool '${tool.name}' is disabled`, policyId: null }
    }

    // 2. Check risk level — only READ_ONLY tools are freely executable initially
    if (tool.riskLevel !== 'READ_ONLY') {
      const actionCheck = await this.policy.checkAction(tool.riskLevel, {
        userId: context.userId,
        organizationId: context.organizationId,
        userRole: '',
        userPermissionLevel: '',
      })
      if (!actionCheck.allowed) {
        this.logger.warn('Tool risk level not permitted', {
          toolName: tool.name,
          riskLevel: tool.riskLevel,
          executionId: context.executionId,
        })
        return {
          allowed: false,
          reason: `Risk level '${tool.riskLevel}' not permitted: ${actionCheck.reason}`,
          policyId: actionCheck.policyId,
        }
      }
    }

    // 3. Check required capabilities
    if (tool.requiredCapabilities.length > 0) {
      const capabilities = await this.policy.getCapabilities({
        userId: context.userId,
        organizationId: context.organizationId,
        userRole: '',
        userPermissionLevel: '',
      })

      const missing = tool.requiredCapabilities.filter(
        (cap) => !capabilities.capabilities.includes(cap),
      )
      if (missing.length > 0) {
        this.logger.warn('Missing required capabilities', {
          toolName: tool.name,
          missing,
          executionId: context.executionId,
        })
        return {
          allowed: false,
          reason: `Missing required capabilities: ${missing.join(', ')}`,
          policyId: null,
        }
      }

      // Also check if tool is in the blocked list
      if (capabilities.blockedTools.includes(tool.name)) {
        return {
          allowed: false,
          reason: `Tool '${tool.name}' is blocked by policy`,
          policyId: null,
        }
      }
    }

    // 4. Verify organization context is present
    if (!context.organizationId || context.organizationId === '') {
      this.logger.error('Missing organization context', { executionId: context.executionId })
      return { allowed: false, reason: 'Missing organization context', policyId: null }
    }

    this.logger.debug('Tool authorized', {
      toolName: tool.name,
      executionId: context.executionId,
      riskLevel: tool.riskLevel,
    })

    return { allowed: true, reason: null, policyId: null }
  }
}
