/* KnowledgeLookupTool — retrieves specific knowledge nodes with real authorization.

Uses:
  IKnowledgeService.findById() → loads node + checks read permission
  IAuthorizationService → compiled context for permission evaluation
*/

import type { ILogger } from '../../../../common/interfaces/logger.interface'
import type {
  ToolRegistration,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../domain/agent.interfaces'
import type { ToolDependencies } from '../tool-dependencies'

export const KNOWLEDGE_LOOKUP_TOOL_NAME = 'knowledge_lookup'

export function createKnowledgeLookupTool(
  logger: ILogger,
  deps: ToolDependencies,
): ToolRegistration {
  return {
    schema: {
      name: KNOWLEDGE_LOOKUP_TOOL_NAME,
      description:
        'Look up specific knowledge nodes by ID. ' +
        'Returns the node content only if authorized for your organization and permission level. ' +
        'Uses the real KnowledgeService with authorization checks.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: {
            type: 'string',
            format: 'uuid',
            description: 'The knowledge node ID to look up',
          },
        },
        required: ['nodeId'],
      },
      requiredCapabilities: ['KNOWLEDGE_READ'],
      riskLevel: 'READ_ONLY',
      timeoutMs: 15_000,
      enabled: true,
    },

    async execute(
      input: Record<string, unknown>,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> {
      const nodeId = input.nodeId as string

      logger.debug('KnowledgeLookupTool executing via real KnowledgeService', {
        nodeId,
        executionId: context.executionId,
      })

      try {
        const user = buildUser(context)
        if (user === null) {
          return {
            success: false,
            data: null,
            summary: 'Cannot look up: user context is missing',
            error: 'Missing user context for authorization',
            durationMs: 0,
          }
        }

        const startTime = performance.now()

        // Call the real KnowledgeService — authorization enforced
        const node = await deps.knowledgeService.findById(user, nodeId)

        const durationMs = performance.now() - startTime

        const result: Record<string, unknown> = {
          nodeId: node.id,
          title: node.title,
          type: node.type,
          status: node.status,
          content: node.content,
          importance: node.importance,
          organizationId: context.organizationId,
          authorizationChecked: true,
        }

        logger.debug('KnowledgeLookupTool: node found', {
          executionId: context.executionId,
          nodeId,
          title: node.title,
          durationMs,
        })

        return {
          success: true,
          data: result,
          summary: `Looked up knowledge node "${node.title}" (${node.type})`,
          error: null,
          durationMs,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Lookup failed'
        logger.debug('KnowledgeLookupTool: node not found or unauthorized', {
          executionId: context.executionId,
          nodeId,
          error: message,
        })

        // Return structured failure — not an error (node may not exist or be unauthorized)
        return {
          success: false,
          data: null,
          summary: `Knowledge node ${nodeId} not found or not accessible`,
          error: message,
          durationMs: 0,
        }
      }
    },
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
