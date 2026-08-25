/* get_run MCP tool — allows AI agents to inspect previous pipeline executions.

Reuses the existing Pipeline Run Store. The agent can only retrieve runs
that its server-side identity is authorized to inspect. Agent-supplied
organizationId is NEVER trusted. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession, McpToolResult } from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { IPipelineRunService } from '../../pipeline/runs/pipeline-run.service'
import { getRunInputSchema, type GetRunInput } from '../schemas/mcp-tool-schemas'
import { toMcpError } from '../errors/mcp-errors'
import type { McpToolDefinition } from '@contextgraph/types'

@Injectable()
export class GetRunTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'get_run',
    description:
      'Retrieve details of a previous ContextGraph pipeline execution. ' +
      'Returns run status, stage summary, metrics, and safe execution metadata. ' +
      'The agent can only access runs within its authenticated organization.',
    requiredCapabilities: [Cap.PIPELINE_READ],
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string', description: 'UUID of the pipeline run (requestId)' },
      },
      required: ['runId'],
    },
    readOnly: true,
  }

  constructor(@Inject(IPipelineRunService) private readonly runService: IPipelineRunService) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    let validated: GetRunInput
    try {
      validated = getRunInputSchema.parse(input)
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

    try {
      const startTime = performance.now()
      // Organization-scoped query — authorization enforced by the repository.
      const run = await this.runService.findByRequestId(session.organizationId, validated.runId)
      const executionTimeMs = Math.round(performance.now() - startTime)

      // Map to safe MCP response — no internal secrets, no raw Prisma models.
      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'success' as const,
        data: {
          runId: run.requestId,
          status: run.status,
          pipelineVersion: run.version,
          mode: run.mode,
          strategy: run.strategy,
          evaluatedAt: run.evaluatedAt,
          createdAt: run.createdAt,
          stageSummary: (run.trace as Array<Record<string, unknown>>).map((stage) => ({
            stageName: stage.stageName ?? stage.stageId,
            status: stage.status,
            durationMs: stage.durationMs,
            outputCount: stage.outputCount,
          })),
          metrics: run.metrics
            ? {
                totalDurationMs: (run.metrics as Record<string, unknown>).totalDurationMs,
                reachableNodes: (run.metrics as Record<string, unknown>).reachableNodes,
                includedCandidates: (run.metrics as Record<string, unknown>).includedCandidates,
                tokensUsed: run.tokensUsed,
              }
            : null,
          error: run.error,
        },
        metadata: {
          executionTimeMs,
          organizationId: session.organizationId,
          principalId: session.principalId,
          pipelineRunId: run.requestId,
          timestamp: new Date().toISOString(),
        },
      }
    } catch (error) {
      const mcpError = toMcpError(error)
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
