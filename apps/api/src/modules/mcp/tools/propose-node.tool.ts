/* propose_node MCP tool — allows AI agents to propose governed knowledge.

The agent submits a node proposal (FACT or DECISION). The tool internally
invokes the WriteBack Service which performs:
  Identity → Authorization → Schema Validation → Content Hash → Duplicate Check →
  Graph Validation → Policy Check → Approval Decision → Persistence

The agent NEVER directly writes to the database. */

import { Inject, Injectable } from '@nestjs/common'
import type {
  AuthenticatedUser,
  McpSession,
  McpToolDefinition,
  McpToolResult,
} from '@contextgraph/types'
import { McpCapability as Cap } from '@contextgraph/types'
import { IMcpTool } from '../domain/mcp.interfaces'
import { IWriteBackService } from '../../writeback/domain/writeback.interfaces'
import { toMcpError } from '../errors/mcp-errors'
import { buildAgentUser, invalidInputResult, mcpErrorResult, resultMetadata } from './tool-helpers'
import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format')

const proposeNodeInputSchema = z.object({
  nodeType: z.enum(['FACT', 'DECISION']),
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(50_000),
  classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).default('INTERNAL'),
  workspaceId: uuidSchema,
  departmentId: uuidSchema.nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  complianceTags: z.array(z.string().max(50)).max(10).optional().default([]),
  sourceReferences: z
    .array(
      z.object({
        sourceNodeId: uuidSchema.optional(),
        sourceDocumentId: uuidSchema.optional(),
        sourcePipelineRunId: uuidSchema.optional(),
        sourceAgentExecutionId: uuidSchema.optional(),
        sourceMcpSessionId: uuidSchema.optional(),
        sourceExternalReference: z.string().max(2000).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  relationshipRequests: z
    .array(
      z.object({
        targetNodeId: uuidSchema,
        relationshipType: z.enum([
          'SUPPORTS',
          'REQUIRES',
          'DERIVED_FROM',
          'SUPERSEDES',
          'CONTRADICTS',
        ]),
        weight: z.number().min(0).max(1).optional().default(1),
        metadata: z.record(z.string(), z.unknown()).optional().default({}),
      }),
    )
    .max(50)
    .optional()
    .default([]),
  purpose: z.string().max(1000).nullable().optional().default(null),
  idempotencyKey: z.string().max(255).nullable().optional().default(null),
})

type ProposeNodeInput = z.infer<typeof proposeNodeInputSchema>

@Injectable()
export class ProposeNodeTool implements IMcpTool {
  readonly definition: McpToolDefinition = {
    name: 'propose_node',
    description:
      'Propose a new governed knowledge node to ContextGraph. The proposal is validated against ' +
      "the authenticated agent's permissions, organization policies, compliance constraints, " +
      'and graph rules before it can become active knowledge. Returns the proposal decision, ' +
      'validation trace, and the published node ID if auto-approved.',
    requiredCapabilities: [Cap.CONTEXT_RESOLVE],
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          enum: ['FACT', 'DECISION'],
          description: 'Node type — only FACT and DECISION are allowed',
        },
        title: {
          type: 'string',
          description: 'Short, descriptive title (1-300 chars)',
        },
        content: {
          type: 'string',
          description: 'Full content body (1-50000 chars)',
        },
        classification: {
          type: 'string',
          enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
          description: 'Data classification (default: INTERNAL)',
        },
        workspaceId: {
          type: 'string',
          description: 'UUID of the workspace',
        },
        sourceReferences: {
          type: 'array',
          description: 'Source provenance for the knowledge',
        },
        relationshipRequests: {
          type: 'array',
          description: 'Relationships to existing nodes',
        },
        purpose: {
          type: 'string',
          description: 'Why this knowledge is being proposed',
        },
        idempotencyKey: {
          type: 'string',
          description: 'Client-supplied idempotency key',
        },
      },
      required: ['nodeType', 'title', 'content', 'workspaceId'],
    },
    readOnly: false,
  }

  constructor(
    @Inject(IWriteBackService)
    private readonly writeBackService: IWriteBackService,
  ) {}

  async execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult> {
    // 1. Validate input with Zod.
    let validated: ProposeNodeInput
    try {
      validated = proposeNodeInputSchema.parse(input)
    } catch (error) {
      return invalidInputResult(this.definition.name, session, requestId, error)
    }

    // 2. Build AuthenticatedUser from session (server-derived, never from input).
    const user: AuthenticatedUser = buildAgentUser(session)

    // 3. Execute the proposal through the WriteBack service.
    try {
      const startTime = performance.now()
      const result = await this.writeBackService.propose(user, {
        nodeType: validated.nodeType,
        title: validated.title,
        content: validated.content,
        classification: validated.classification,
        workspaceId: validated.workspaceId,
        departmentId: validated.departmentId,
        metadata: validated.metadata,
        complianceTags: validated.complianceTags,
        sourceReferences: validated.sourceReferences,
        relationshipRequests: validated.relationshipRequests,
        purpose: validated.purpose ?? undefined,
        idempotencyKey: validated.idempotencyKey ?? undefined,
      })
      const executionTimeMs = Math.round(performance.now() - startTime)

      return {
        toolCallId: requestId,
        toolName: this.definition.name,
        status: 'success' as const,
        data: {
          proposalId: result.proposalId,
          decision: result.decision,
          status: result.status,
          nodeId: result.nodeId,
          approvalRequired: result.approvalRequired,
          reasonCode: result.reasonCode,
          validationTrace: result.validationTrace,
          runId: result.runId,
        },
        metadata: resultMetadata(session, executionTimeMs, result.runId ?? undefined),
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
