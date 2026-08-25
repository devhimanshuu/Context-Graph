/* Shared MCP tool helpers — construction of the server-derived agent identity
and standardized McpToolResult builders for validation failures and errors.

Every MCP agent acts under a fixed READ/VIEWER/STANDARD clearance regardless of
claimed capabilities; the pipeline's own authorization still gates all data. */

import type {
  AuthenticatedUser,
  McpSession,
  McpToolResult,
  McpToolResultStatus,
} from '@contextgraph/types'

/** Build the trusted server-side identity for an MCP session. */
export function buildAgentUser(session: McpSession): AuthenticatedUser {
  return {
    id: session.principalId,
    organizationId: session.organizationId,
    departmentId: null,
    email: 'mcp-agent@contextgraph.local',
    name: `MCP Agent (${session.sessionId.slice(0, 8)})`,
    role: 'VIEWER',
    permissionLevel: 'READ',
    complianceClearance: 'STANDARD',
  }
}

/** Standard metadata block attached to every tool result. */
export function resultMetadata(
  session: McpSession,
  executionTimeMs = 0,
  pipelineRunId?: string,
): McpToolResult['metadata'] {
  return {
    executionTimeMs,
    organizationId: session.organizationId,
    principalId: session.principalId,
    timestamp: new Date().toISOString(),
    ...(pipelineRunId !== undefined ? { pipelineRunId } : {}),
  }
}

/** Result for a Zod validation failure. */
export function invalidInputResult(
  toolName: string,
  session: McpSession,
  requestId: string,
  cause: unknown,
): McpToolResult {
  return {
    toolCallId: requestId,
    toolName,
    status: 'invalid_input' satisfies McpToolResultStatus,
    error: `Input validation failed: ${cause instanceof Error ? cause.message : 'Unknown error'}`,
    metadata: resultMetadata(session),
  }
}

/** Result mapped from an McpError (or any thrown value via toMcpError). */
export function mcpErrorResult(
  toolName: string,
  session: McpSession,
  requestId: string,
  status: McpToolResultStatus,
  message: string,
): McpToolResult {
  return {
    toolCallId: requestId,
    toolName,
    status,
    error: message,
    metadata: resultMetadata(session),
  }
}
