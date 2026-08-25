/* resolve_context MCP tool — allows AI agents to request governed context.

The agent sends a query and workspace. The tool internally invokes the existing
Context Pipeline Orchestrator which performs:
  Authorization → Graph Traversal → Rule Engine → Candidate Build → Ranking → Budget

The agent receives ONLY the authorized context. It cannot bypass permissions,
rules, or organization isolation. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession, McpToolResult } from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { IContextPipelineOrchestrator } from '../../pipeline/orchestrator/context-pipeline-orchestrator'
import { resolveContextInputSchema, type ResolveContextInput } from '../schemas/mcp-tool-schemas'
import { McpPipelineFailedError, toMcpError } from '../errors/mcp-errors'
import type { McpToolDefinition } from '@contextgraph/types'
import type { AuthenticatedUser } from '@contextgraph/types'

@Injectable()
export class ResolveContextTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'resolve_context',
    description:
      'Retrieve organization knowledge that the current authenticated principal is authorized to use. ' +
      'Context is filtered by ContextGraph permission and deterministic policy engine. ' +
      'Returns ranked, budgeted, explainable context items with full provenance.',
    requiredCapabilities: [Cap.CONTEXT_RESOLVE],
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query describing the information needed',
        },
        workspaceId: { type: 'string', description: 'UUID of the workspace to search' },
        entryNodeId: {
          type: 'string',
          description: 'Optional entry node UUID to start graph traversal from',
        },
        topK: { type: 'number', description: 'Maximum number of results (1-100, default 20)' },
        maxCandidates: {
          type: 'number',
          description: 'Maximum candidates before budget (1-100, default 30)',
        },
        retrievalMode: {
          type: 'string',
          enum: ['bfs', 'weighted'],
          description: 'Graph traversal strategy (bfs=hops, weighted=edge weights)',
        },
        tokenBudget: {
          type: 'number',
          description: 'Maximum tokens for context (256-100000, default 4096)',
        },
        executionMode: {
          type: 'string',
          enum: ['STANDARD', 'DEBUG', 'AUDIT'],
          description: 'Pipeline execution mode',
        },
      },
      required: ['query', 'workspaceId'],
    },
    readOnly: true,
  }

  constructor(
    @Inject(IContextPipelineOrchestrator)
    private readonly orchestrator: IContextPipelineOrchestrator,
  ) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    // 1. Validate input with Zod.
    let validated: ResolveContextInput
    try {
      validated = resolveContextInputSchema.parse(input)
    } catch (error) {
      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'invalid_input' as const,
        error: `Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          executionTimeMs: 0,
          organizationId: session.organizationId,
          principalId: session.principalId,
          timestamp: new Date().toISOString(),
        },
      }
    }

    // 2. Build AuthenticatedUser from session (server-derived, never from input).
    const user: AuthenticatedUser = {
      id: session.principalId,
      organizationId: session.organizationId,
      departmentId: null,
      email: 'mcp-agent@contextgraph.local',
      name: `MCP Agent (${session.sessionId.slice(0, 8)})`,
      role: 'VIEWER',
      permissionLevel: 'READ',
      complianceClearance: 'STANDARD',
    }

    // 3. Execute the pipeline — authorization, graph traversal, rules, ranking, budget.
    try {
      const startTime = performance.now()
      const pkg = await this.orchestrator.resolve(user, {
        workspaceId: validated.workspaceId,
        entryNodeId: validated.entryNodeId ?? validated.workspaceId,
        maxDepth: 5,
        strategy: validated.retrievalMode,
        tokenBudget: validated.tokenBudget,
        maxCandidates: validated.maxCandidates,
        mode: validated.executionMode,
      })
      const executionTimeMs = Math.round(performance.now() - startTime)

      // 4. Map the ContextPackage to a safe MCP response.
      const contextItems = pkg.candidates.map((candidate) => ({
        nodeId: candidate.candidateId,
        title: candidate.title,
        type: candidate.type,
        status: candidate.status,
        importance: candidate.importance,
        distance: candidate.distance,
        content: candidate.content,
        complianceTags: candidate.complianceTags,
        inclusionReason: String(candidate.inclusionReason),
        tokens: candidate.tokens,
      }))

      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'success' as const,
        data: {
          packageId: pkg.packageId,
          requestId: pkg.requestId,
          pipelineRunId: pkg.requestId,
          contextItems,
          summary: {
            totalCandidates: pkg.candidates.length + pkg.exclusions.length,
            includedCandidates: pkg.candidates.length,
            totalTokens: pkg.tokensUsed,
            truncated: pkg.truncated,
          },
          funnel: pkg.summary.funnel,
        },
        metadata: {
          executionTimeMs,
          organizationId: session.organizationId,
          principalId: session.principalId,
          pipelineRunId: pkg.requestId,
          timestamp: new Date().toISOString(),
        },
      }
    } catch (error) {
      const mcpError = toMcpError(error)
      if (mcpError instanceof McpPipelineFailedError || mcpError.code === 'pipeline_failed') {
        return {
          toolCallId: requestId,
          toolName: this.definition.name,
          status: 'pipeline_failed' as const,
          error: mcpError.message,
          metadata: {
            executionTimeMs: 0,
            organizationId: session.organizationId,
            principalId: session.principalId,
            timestamp: new Date().toISOString(),
          },
        }
      }
      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: mcpError.code,
        error: mcpError.message,
        metadata: {
          executionTimeMs: 0,
          organizationId: session.organizationId,
          principalId: session.principalId,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }
}
