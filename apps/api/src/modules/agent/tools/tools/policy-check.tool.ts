/* PolicyCheckTool — asks the real authorization engine for a policy decision.

Uses:
  IAuthorizationService.checkAction() → compiled context + permission evaluation
  The result is authoritative and cannot be overridden by the LLM.
*/

import type { ILogger } from '../../../../common/interfaces/logger.interface'
import type {
  ToolRegistration,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../domain/agent.interfaces'
import type { ToolDependencies } from '../tool-dependencies'

export const POLICY_CHECK_TOOL_NAME = 'policy_check'

export function createPolicyCheckTool(logger: ILogger, deps: ToolDependencies): ToolRegistration {
  return {
    schema: {
      name: POLICY_CHECK_TOOL_NAME,
      description:
        'Check whether a specific operation is permitted under current policies. ' +
        'Returns the authoritative policy decision from the ContextGraph authorization engine. ' +
        'The result is final and cannot be overridden.',
      inputSchema: {
        type: 'object',
        properties: {
          resourceType: {
            type: 'string',
            description: 'The type of resource (e.g., "knowledge", "document", "graph")',
          },
          action: {
            type: 'string',
            description: 'The action to check (READ, WRITE, DELETE, MANAGE)',
          },
        },
        required: ['resourceType', 'action'],
      },
      requiredCapabilities: ['POLICY_READ'],
      riskLevel: 'READ_ONLY',
      timeoutMs: 5_000,
      enabled: true,
    },

    async execute(
      input: Record<string, unknown>,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> {
      const resourceType = input.resourceType as string
      const action = input.action as string

      logger.debug('PolicyCheckTool executing via real AuthorizationService', {
        resourceType,
        action,
        executionId: context.executionId,
      })

      try {
        const user = buildUser(context)
        if (user === null) {
          return {
            success: false,
            data: null,
            summary: 'Cannot check policy: user context is missing',
            error: 'Missing user context for authorization',
            durationMs: 0,
          }
        }

        const startTime = performance.now()

        // Map action string to PermissionAction enum
        const permissionAction = mapAction(action)

        // Call the real AuthorizationService — the authoritative decision
        await deps.authorizationService.checkAction(user, resourceType, permissionAction)

        const durationMs = performance.now() - startTime

        // If checkAction didn't throw, the action is allowed
        const result: Record<string, unknown> = {
          resourceType,
          action,
          allowed: true,
          reason: null,
          authorizationChecked: true,
          organizationId: context.organizationId,
          note: 'This is the system-level policy decision and cannot be overridden by the agent',
        }

        logger.debug('PolicyCheckTool: policy allows', {
          executionId: context.executionId,
          resourceType,
          action,
          durationMs,
        })

        return {
          success: true,
          data: result,
          summary: `Policy check for ${action} on ${resourceType}: ALLOWED`,
          error: null,
          durationMs,
        }
      } catch (error) {
        const durationMs = 0
        const message = error instanceof Error ? error.message : 'Policy check failed'

        const result: Record<string, unknown> = {
          resourceType,
          action,
          allowed: false,
          reason: message,
          authorizationChecked: true,
          organizationId: context.organizationId,
          note: 'This is the system-level policy decision and cannot be overridden by the agent',
        }

        logger.debug('PolicyCheckTool: policy denies', {
          executionId: context.executionId,
          resourceType,
          action,
          reason: message,
        })

        return {
          success: true, // The tool succeeded — the denial is the result
          data: result,
          summary: `Policy check for ${action} on ${resourceType}: DENIED — ${message}`,
          error: null,
          durationMs,
        }
      }
    },
  }
}

function mapAction(action: string): import('@contextgraph/types').PermissionAction {
  const upper = action.toUpperCase()
  switch (upper) {
    case 'READ':
      return 'READ'
    case 'WRITE':
      return 'WRITE'
    case 'DELETE':
      return 'DELETE'
    case 'MANAGE':
      return 'MANAGE'
    default:
      return 'READ' // Default to read for safety
  }
}

function buildUser(
  context: ToolExecutionContext,
): import('@contextgraph/types').AuthenticatedUser | null {
  if (!context.userId || !context.organizationId) return null
  return {
    id: context.userId,
    organizationId: context.organizationId,
    departmentId: null,
    email: '',
    name: '',
    role: 'VIEWER',
    permissionLevel: 'READ',
    complianceClearance: 'STANDARD',
  }
}
