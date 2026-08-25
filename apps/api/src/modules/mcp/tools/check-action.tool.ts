/* check_action MCP tool — evaluates whether an authenticated agent is permitted to perform an action.

"Evaluate whether the authenticated agent is permitted to perform a requested action
against a target resource using ContextGraph's deterministic authorization and policy controls."

The tool delegates to the same ActionGuardrailService used by the REST endpoint.
No business logic is duplicated. The agent's identity comes from the MCP session —
never from tool arguments. */

import { Injectable } from '@nestjs/common'
import type { McpSession, McpToolDefinition, McpToolResult } from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { ActionGuardrailService } from '../../guardrails/services/action-guardrail.service'
import { actionCheckInputSchema, type ActionCheckInput } from '../schemas/mcp-tool-schemas'
import { toMcpError } from '../errors/mcp-errors'
import { invalidInputResult, mcpErrorResult, resultMetadata } from './tool-helpers'

@Injectable()
export class CheckActionTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'check_action',
    description:
      'Evaluate whether the authenticated agent is permitted to perform a requested action ' +
      "against a target resource using ContextGraph's deterministic authorization and policy " +
      'controls. Returns ALLOW, DENY, or REQUIRES_APPROVAL with a full guardrail trace. ' +
      'This tool never executes the action itself.',
    requiredCapabilities: [Cap.CONTEXT_RESOLVE],
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The action to evaluate (e.g., UPDATE_KNOWLEDGE, SEND_EXTERNAL_MESSAGE)',
        },
        targetType: {
          type: 'string',
          description: 'Type of the target resource (e.g., KNOWLEDGE_NODE, DOCUMENT)',
        },
        targetId: {
          type: 'string',
          description: 'UUID of the target resource (null for create actions)',
        },
        parameters: {
          type: 'object',
          description: 'Additional parameters for the action evaluation',
        },
        purpose: {
          type: 'string',
          description: 'Brief description of the intended purpose',
        },
      },
      required: ['action', 'targetType'],
    },
    readOnly: true,
  }

  constructor(private readonly guardrailService: ActionGuardrailService) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    // 1. Validate input with Zod.
    let validated: ActionCheckInput
    try {
      validated = actionCheckInputSchema.parse(input)
    } catch (error) {
      return invalidInputResult(this.definition.name, session, requestId, error)
    }

    // 2. Execute the guardrail evaluation through the shared service.
    try {
      const startTime = performance.now()
      const result = await this.guardrailService.checkFromMcpSession(
        session,
        {
          action: validated.action,
          targetType: validated.targetType,
          targetId: validated.targetId ?? null,
          parameters: validated.parameters ?? {},
          purpose: validated.purpose ?? null,
        },
        requestId,
      )
      const executionTimeMs = Math.round(performance.now() - startTime)

      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'success' as const,
        data: {
          allowed: result.decision.allowed,
          decision: result.decision.decision,
          action: result.decision.action,
          targetType: result.decision.targetType,
          targetId: result.decision.targetId,
          riskLevel: result.decision.riskLevel,
          reasonCode: result.decision.reasonCode,
          explanation: result.decision.explanation,
          violatedPolicies: result.decision.violatedPolicies,
          approvalRequired: result.decision.approvalRequired,
          approvalReason: result.decision.approvalReason,
          trace: result.decision.publicTrace.map((t) => ({
            guardrail: t.guardrailName,
            passed: t.passed,
            reason: t.explanation,
            severity: t.severity,
          })),
        },
        metadata: {
          ...resultMetadata(session, executionTimeMs),
        },
      }
    } catch (error) {
      const mcpError = toMcpError(error)
      return mcpErrorResult(
        this.definition.name,
        session,
        requestId,
        mcpError.code,
        mcpError.message,
      )
    }
  }
}
