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
import { invalidInputResult, mcpErrorResult, resultMetadata } from './tool-helpers'
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
      return invalidInputResult(this.definition.name, session, requestId, error)
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
          stageSummary: parseStageSummary(run.trace),
          metrics:
            run.metrics !== null && typeof run.metrics === 'object'
              ? {
                  totalDurationMs: (run.metrics as Record<string, unknown>).totalDurationMs,
                  reachableNodes: (run.metrics as Record<string, unknown>).reachableNodes,
                  includedCandidates: (run.metrics as Record<string, unknown>).includedCandidates,
                  tokensUsed: run.tokensUsed,
                }
              : null,
          error: run.error,
        },
        metadata: resultMetadata(session, executionTimeMs, run.requestId),
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

interface ParsedStage {
  readonly stageName: string
  readonly status: string
  readonly durationMs: number | null
  readonly outputCount: number | null
}

/** Defensively extract a stage summary from an untrusted trace payload. */
function parseStageSummary(trace: unknown): ParsedStage[] {
  if (!Array.isArray(trace)) return []
  return trace.flatMap((stage) => {
    if (stage === null || typeof stage !== 'object') return []
    const s = stage as Record<string, unknown>
    return [
      {
        stageName: String(s.stageName ?? s.stageId ?? 'unknown'),
        status: String(s.status ?? 'unknown'),
        durationMs: typeof s.durationMs === 'number' ? s.durationMs : null,
        outputCount: typeof s.outputCount === 'number' ? s.outputCount : null,
      },
    ]
  })
}
