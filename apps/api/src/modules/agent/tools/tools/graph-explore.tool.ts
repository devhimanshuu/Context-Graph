/* GraphExploreTool — traverses the real knowledge graph with authorization.

Uses the existing GraphEngine:
  IGraphService.reachableNodes() → permission-filtered BFS/weighted traversal
  Authorization happens at the engine boundary.
*/

import type { ILogger } from '../../../../common/interfaces/logger.interface'
import type {
  ToolRegistration,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../domain/agent.interfaces'
import type { ToolDependencies } from '../tool-dependencies'

export const GRAPH_EXPLORE_TOOL_NAME = 'graph_explore'

export function createGraphExploreTool(logger: ILogger, deps: ToolDependencies): ToolRegistration {
  return {
    schema: {
      name: GRAPH_EXPLORE_TOOL_NAME,
      description:
        'Explore the knowledge graph structure. Find nodes connected to a given node, ' +
        'discover relationships, and traverse graph paths. ' +
        'Uses the real GraphEngine with permission-filtered BFS traversal. ' +
        'Returns only authorized nodes.',
      inputSchema: {
        type: 'object',
        properties: {
          entryNodeId: {
            type: 'string',
            format: 'uuid',
            description: 'The node to start exploration from',
          },
          workspaceId: {
            type: 'string',
            format: 'uuid',
            description: 'The workspace to explore within',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum traversal depth (default: 2, max: 8)',
          },
          strategy: {
            type: 'string',
            description: 'Traversal strategy: bfs or weighted',
          },
        },
        required: ['entryNodeId'],
      },
      requiredCapabilities: ['GRAPH_READ'],
      riskLevel: 'READ_ONLY',
      timeoutMs: 30_000,
      enabled: true,
    },

    async execute(
      input: Record<string, unknown>,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> {
      const entryNodeId = input.entryNodeId as string
      const workspaceId = (input.workspaceId as string) ?? context.workspaceId
      const maxDepth = Math.min((input.maxDepth as number) ?? 2, 8)
      const strategy = (input.strategy as string) ?? 'bfs'

      logger.debug('GraphExploreTool executing via real GraphEngine', {
        entryNodeId,
        workspaceId,
        maxDepth,
        executionId: context.executionId,
      })

      try {
        const user = buildUser(context)
        if (user === null) {
          return {
            success: false,
            data: null,
            summary: 'Cannot explore: user context is missing',
            error: 'Missing user context for authorization',
            durationMs: 0,
          }
        }

        const startTime = performance.now()

        // Call the real GraphEngine — permission-filtered reachability
        const reachability = await deps.graphService.reachableNodes(user, workspaceId, {
          entryNodeId,
          maxDepth,
          strategy: strategy as 'bfs' | 'weighted',
        })

        const durationMs = performance.now() - startTime

        // Build authorized node list (nodes may be undefined from the DTO)
        const nodes = (reachability.nodes ?? []).map((node) => ({
          id: node.id,
          title: node.title,
          type: node.type,
          status: node.status,
        }))

        // Build traversal info (traversal may be undefined from the DTO)
        const traversal = (reachability.traversal ?? []).map((t) => ({
          id: t.id,
          distance: t.distance,
          order: t.order,
        }))

        const result: Record<string, unknown> = {
          entryNodeId,
          workspaceId,
          maxDepth,
          strategy,
          reachableNodes: nodes,
          nodeCount: nodes.length,
          filteredNodeCount: reachability.filteredNodeCount ?? 0,
          distances: reachability.distances,
          traversal,
          metadata: reachability.metadata,
          authorizationChecked: true,
          organizationId: context.organizationId,
        }

        logger.debug('GraphExploreTool: traversal complete', {
          executionId: context.executionId,
          entryNodeId,
          reachableNodes: nodes.length,
          filtered: reachability.filteredNodeCount ?? 0,
          durationMs,
        })

        return {
          success: true,
          data: result,
          summary: `Explored graph from node ${entryNodeId} (depth ${maxDepth}) — ${nodes.length} authorized nodes reachable (${reachability.filteredNodeCount ?? 0} filtered by authorization)`,
          error: null,
          durationMs,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Graph traversal failed'
        logger.error('GraphExploreTool: traversal failed', {
          executionId: context.executionId,
          error: message,
        })

        return {
          success: false,
          data: null,
          summary: `Graph exploration failed: ${message}`,
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
