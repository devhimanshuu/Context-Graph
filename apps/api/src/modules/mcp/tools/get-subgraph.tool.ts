/* get_subgraph MCP tool — allows AI agents to inspect authorized graph portions.

The agent sends a nodeId and workspace. The tool internally invokes the existing
Graph Engine's reachableNodes method, which performs BFS traversal with permission
filtering. The agent receives ONLY the authorized subgraph.

Security: structurally reachable but unauthorized nodes are filtered out.
The agent cannot access graph nodes merely because they are connected. */

import { Inject, Injectable } from '@nestjs/common'
import type {
  AuthenticatedUser,
  McpSession,
  McpToolDefinition,
  McpToolResult,
} from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { IGraphService } from '../../graph/graph.service'
import { getSubgraphInputSchema, type GetSubgraphInput } from '../schemas/mcp-tool-schemas'
import { toMcpError } from '../errors/mcp-errors'
import { buildAgentUser, invalidInputResult, mcpErrorResult, resultMetadata } from './tool-helpers'

@Injectable()
export class GetSubgraphTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'get_subgraph',
    description:
      'Inspect an authorized portion of the knowledge graph starting from a node. ' +
      'Returns only nodes and edges the current authenticated principal can read. ' +
      'Unauthorized nodes are filtered out even if structurally connected.',
    requiredCapabilities: [Cap.GRAPH_READ],
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'UUID of the node to start from' },
        workspaceId: { type: 'string', description: 'UUID of the workspace' },
        maxDepth: { type: 'number', description: 'Maximum traversal depth (1-10, default 3)' },
        direction: {
          type: 'string',
          enum: ['outgoing', 'incoming', 'both'],
          description: 'Traversal direction',
        },
        includeMetadata: { type: 'boolean', description: 'Include node metadata in response' },
      },
      required: ['nodeId', 'workspaceId'],
    },
    readOnly: true,
  }

  constructor(@Inject(IGraphService) private readonly graphService: IGraphService) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    let validated: GetSubgraphInput
    try {
      validated = getSubgraphInputSchema.parse(input)
    } catch (error) {
      return invalidInputResult(this.definition.name, session, requestId, error)
    }

    const user: AuthenticatedUser = buildAgentUser(session)

    try {
      const startTime = performance.now()
      const result = await this.graphService.reachableNodes(user, validated.workspaceId, {
        entryNodeId: validated.nodeId,
        maxDepth: validated.maxDepth,
        strategy: 'bfs',
      })
      const executionTimeMs = Math.round(performance.now() - startTime)

      // Map to safe MCP response — only IDs, titles, types, distances.
      const nodes = (result.nodes ?? []).map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type,
        distance: result.distances[node.id] ?? 0,
      }))

      // Build edges from traversal data (parent relationships).
      const edges: Array<{ source: string; target: string; relationship: string }> = []
      for (const traversal of result.traversal ?? []) {
        for (const parentId of traversal.parentIds) {
          edges.push({
            source: parentId,
            target: traversal.id,
            relationship: 'CONNECTED_TO',
          })
        }
      }

      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'success' as const,
        data: {
          entryNodeId: result.entryNodeId,
          nodes,
          edges,
          metadata: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            maxDepth: validated.maxDepth,
            filteredNodes: result.filteredNodeCount,
          },
        },
        metadata: resultMetadata(session, executionTimeMs),
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
