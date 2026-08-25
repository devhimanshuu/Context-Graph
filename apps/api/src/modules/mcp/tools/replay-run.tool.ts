/* replay_run MCP tool — allows authorized clients to replay a pipeline execution.

Reuses the existing PipelineRunService to reconstruct the ContextPackage from
an immutable run record. Replay preserves organization isolation and current
security policies.

Important: replay uses CURRENT authorization state, not historical.
A run that was authorized under old policies is re-evaluated under current rules. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession, McpToolResult } from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { IPipelineRunService } from '../../pipeline/runs/pipeline-run.service'
import { replayRunInputSchema, type ReplayRunInput } from '../schemas/mcp-tool-schemas'
import { toMcpError } from '../errors/mcp-errors'
import { invalidInputResult, mcpErrorResult, resultMetadata } from './tool-helpers'
import type { McpToolDefinition } from '@contextgraph/types'

@Injectable()
export class ReplayRunTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'replay_run',
    description:
      'Replay a previous ContextGraph pipeline execution. Reconstructs the ' +
      'ContextPackage from the immutable run record. Uses current authorization ' +
      'policies. The agent can only replay runs within its authenticated organization.',
    requiredCapabilities: [Cap.PIPELINE_REPLAY],
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string', description: 'UUID of the pipeline run to replay' },
        options: {
          type: 'object',
          properties: {
            executionMode: { type: 'string', enum: ['STANDARD', 'DEBUG', 'AUDIT'] },
            tokenBudget: { type: 'number', description: 'Override token budget for replay' },
          },
        },
      },
      required: ['runId'],
    },
    readOnly: false,
  }

  constructor(@Inject(IPipelineRunService) private readonly runService: IPipelineRunService) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    let validated: ReplayRunInput
    try {
      validated = replayRunInputSchema.parse(input)
    } catch (error) {
      return invalidInputResult(this.definition.name, session, requestId, error)
    }

    try {
      const startTime = performance.now()
      // Reconstruct the package from the immutable run record.
      const pkg = await this.runService.reconstructPackage(session.organizationId, validated.runId)
      const executionTimeMs = Math.round(performance.now() - startTime)

      // Map to safe MCP response — same format as resolve_context.
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
          replayedFrom: validated.runId,
          contextItems,
          summary: {
            totalCandidates: pkg.candidates.length + pkg.exclusions.length,
            includedCandidates: pkg.candidates.length,
            totalTokens: pkg.tokensUsed,
            truncated: pkg.truncated,
          },
          funnel: pkg.summary.funnel,
          replayedAt: new Date().toISOString(),
        },
        metadata: resultMetadata(session, executionTimeMs, pkg.requestId),
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
