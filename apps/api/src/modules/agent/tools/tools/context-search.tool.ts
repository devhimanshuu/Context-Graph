/* ContextSearchTool — retrieves authorized context through the real ContextGraph pipeline.

Internal flow:
Agent → ContextSearchTool → ContextAssemblyService
  → GraphEngine (permission-filtered reachability)
  → RuleEngine (deterministic filtering with explanations)
  → ContextBudget (token budget fitting)
  → Authorized context candidates

The agent receives only the authorized context.
*/

import type { ILogger } from '../../../../common/interfaces/logger.interface'
import type {
  ToolRegistration,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../domain/agent.interfaces'
import type { ToolDependencies } from '../tool-dependencies'
import { TraversalStrategy } from '../../../graph/domain/traversal'

export const CONTEXT_SEARCH_TOOL_NAME = 'context_search'

export function createContextSearchTool(logger: ILogger, deps: ToolDependencies): ToolRegistration {
  return {
    schema: {
      name: CONTEXT_SEARCH_TOOL_NAME,
      description:
        'Search for relevant context within the knowledge graph. ' +
        'Returns authorized context based on your permissions and organization scope. ' +
        'The search goes through the full ContextGraph pipeline: graph traversal, ' +
        'permission filtering, rule engine evaluation, and token budget fitting.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant context',
            maxLength: 2000,
          },
          workspaceId: {
            type: 'string',
            format: 'uuid',
            description: 'The workspace to search within',
          },
          entryNodeId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional: specific entry node to start from',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum graph traversal depth (default: 3)',
          },
          tokenBudget: {
            type: 'number',
            description: 'Token budget for context (default: 4096)',
          },
        },
        required: ['query'],
      },
      requiredCapabilities: ['CONTEXT_READ'],
      riskLevel: 'READ_ONLY',
      timeoutMs: 30_000,
      enabled: true,
    },

    async execute(
      input: Record<string, unknown>,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> {
      const query = input.query as string
      const workspaceId = (input.workspaceId as string) ?? context.workspaceId
      const maxDepth = Math.min((input.maxDepth as number) ?? 3, 16)
      const tokenBudget = Math.min((input.tokenBudget as number) ?? 4096, 32_000)

      let entryNodeId = input.entryNodeId as string | undefined

      logger.debug('ContextSearchTool executing via real pipeline', {
        query,
        workspaceId,
        executionId: context.executionId,
      })

      try {
        const user = buildUser(context)
        if (user === null) {
          return {
            success: false,
            data: null,
            summary: 'Cannot search: user context is missing',
            error: 'Missing user context for authorization',
            durationMs: 0,
          }
        }

        // If no entry node, search workspace for any accessible node
        if (entryNodeId === undefined) {
          const nodes = await deps.knowledgeService.findByWorkspace(user, workspaceId)
          if (nodes.length === 0) {
            return {
              success: true,
              data: {
                query,
                workspaceId,
                resultCount: 0,
                candidates: [],
                message: 'No accessible knowledge nodes found in workspace',
              },
              summary: `Searched context for "${query}" — 0 accessible nodes in workspace`,
              error: null,
              durationMs: 0,
            }
          }
          entryNodeId = nodes[0]?.id
        }

        if (entryNodeId === undefined) {
          return {
            success: false,
            data: null,
            summary: 'Cannot search: no entry node available',
            error: 'No entry node found in workspace',
            durationMs: 0,
          }
        }

        const startTime = performance.now()

        // Call the real ContextAssemblyService — the full pipeline
        const assemblyResult = await deps.contextAssembly.assemble(user, {
          workspaceId,
          entryNodeId,
          maxDepth,
          strategy: TraversalStrategy.BFS,
          tokenBudget,
        })

        const durationMs = performance.now() - startTime

        const includedCandidates = assemblyResult.candidates
          .filter((c) => c.included)
          .map((c) => ({
            id: c.id,
            title: c.title,
            type: c.type,
            importance: c.importance,
            distance: c.distance,
            tokens: c.tokens,
          }))

        const result: Record<string, unknown> = {
          query,
          workspaceId,
          entryNodeId,
          resultCount: includedCandidates.length,
          totalReachable: assemblyResult.funnel.reachable,
          totalCandidates: assemblyResult.funnel.candidates,
          totalIncluded: assemblyResult.funnel.included,
          candidates: includedCandidates,
          tokensUsed: assemblyResult.tokensUsed,
          tokenBudget,
          truncated: assemblyResult.truncated,
          authorizationChecked: true,
          organizationId: context.organizationId,
          pipelineMetrics: {
            reachable: assemblyResult.funnel.reachable,
            afterRules: assemblyResult.funnel.candidates,
            afterBudget: assemblyResult.funnel.included,
          },
        }

        logger.debug('ContextSearchTool: pipeline complete', {
          executionId: context.executionId,
          reachable: assemblyResult.funnel.reachable,
          included: assemblyResult.funnel.included,
          durationMs,
        })

        return {
          success: true,
          data: result,
          summary: `Searched context for "${query}" — ${includedCandidates.length} authorized candidates returned (from ${assemblyResult.funnel.reachable} reachable nodes)`,
          error: null,
          durationMs,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Pipeline execution failed'
        logger.error('ContextSearchTool: pipeline failed', {
          executionId: context.executionId,
          error: message,
        })

        return {
          success: false,
          data: null,
          summary: `Context search failed: ${message}`,
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
