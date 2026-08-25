/* MCP request handler — central orchestrator for MCP tool requests.

Flow:
  1. Authenticate the request (derive session from credentials)
  2. Validate the tool name exists
  3. Check capability requirements
  4. Check rate limits
  5. Execute the tool
  6. Record audit event
  7. Record observability metrics
  8. Return result

The handler NEVER contains business logic — it delegates to tools. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession } from '@contextgraph/types'
import { McpToolResultStatus } from '@contextgraph/types'
import { ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IMcpAuthenticator,
  IMcpToolRegistry,
  IMcpRateLimiter,
  IMcpAuditLogger,
  IMcpObservability,
} from '../domain/mcp.interfaces'
import { uuid } from '../../../common/utils/uuid'

/** The five DI tokens for MCP infrastructure services. */
export const MCP_AUTHENTICATOR = Symbol('IMcpAuthenticator')
export const MCP_TOOL_REGISTRY = Symbol('IMcpToolRegistry')
export const MCP_RATE_LIMITER = Symbol('IMcpRateLimiter')
export const MCP_AUDIT_LOGGER = Symbol('IMcpAuditLogger')
export const MCP_OBSERVABILITY = Symbol('IMcpObservability')

/** MCP JSON-RPC style request. */
export interface McpJsonRpcRequest {
  readonly jsonrpc: '2.0'
  readonly id: string | number
  readonly method: string
  readonly params?: Record<string, unknown>
}

/** MCP JSON-RPC style response. */
export interface McpJsonRpcResponse {
  readonly jsonrpc: '2.0'
  readonly id: string | number
  readonly result?: unknown
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: unknown
  }
}

@Injectable()
export class McpRequestHandler {
  constructor(
    @Inject(MCP_AUTHENTICATOR) private readonly authenticator: IMcpAuthenticator,
    @Inject(MCP_TOOL_REGISTRY) private readonly registry: IMcpToolRegistry,
    @Inject(MCP_RATE_LIMITER) private readonly rateLimiter: IMcpRateLimiter,
    @Inject(MCP_AUDIT_LOGGER) private readonly auditLogger: IMcpAuditLogger,
    @Inject(MCP_OBSERVABILITY) private readonly observability: IMcpObservability,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Handle a JSON-RPC style MCP request. Returns a JSON-RPC response.
   */
  async handleRequest(
    request: McpJsonRpcRequest,
    headers: Record<string, string | undefined>,
  ): Promise<McpJsonRpcResponse> {
    const requestId = request.id

    // 0. Validate the JSON-RPC envelope shape.
    const validationError = this.validateRequest(request)
    if (validationError !== null) {
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32600, message: validationError },
      }
    }

    // 1. Authenticate.
    const session = await this.authenticator.authenticate(headers)
    if (session === null) {
      this.observability.recordAuthDenial(request.method)
      // No trusted identity exists, so no attributable audit event can be recorded.
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32001,
          message: 'Authentication required',
        },
      }
    }

    // 1b. Enforce session expiry on every request.
    if (Date.now() > Date.parse(session.expiresAt)) {
      this.observability.recordAuthDenial(request.method)
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32001,
          message: 'Session expired',
        },
      }
    }

    // 2. Route the JSON-RPC method.
    try {
      switch (request.method) {
        case 'tools/list':
          return this.handleToolsList(session, requestId)

        case 'tools/call':
          return this.handleToolsCall(session, request, requestId)

        case 'ping':
          return { jsonrpc: '2.0', id: requestId, result: { pong: true } }

        default:
          return {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          }
      }
    } catch (error) {
      this.logger.error('MCP request handler error', { error, method: request.method })
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      }
    }
  }

  /** Validate the JSON-RPC envelope. Returns an error message, or null if valid. */
  private validateRequest(request: McpJsonRpcRequest): string | null {
    if (request.jsonrpc !== '2.0') return 'Invalid jsonrpc version (expected "2.0")'
    if (typeof request.id !== 'string' && typeof request.id !== 'number') {
      return 'Missing or invalid request id'
    }
    if (typeof request.method !== 'string' || request.method.length === 0) {
      return 'Missing or invalid method'
    }
    if (request.params !== undefined && typeof request.params !== 'object') {
      return 'Invalid params (must be an object)'
    }
    return null
  }

  private async recordDeniedAudit(session: McpSession, toolName: string): Promise<void> {
    await this.auditLogger.recordEvent({
      id: uuid(),
      sessionId: session.sessionId,
      principalId: session.principalId,
      organizationId: session.organizationId,
      toolName,
      requestId: session.sessionId,
      outcome: 'denied',
      latencyMs: 0,
      timestamp: new Date().toISOString(),
      metadata: {},
    })
  }

  private handleToolsList(session: McpSession, requestId: string | number): McpJsonRpcResponse {
    // Filter tools to only those the session has capabilities for.
    const tools = this.registry
      .getDefinitions()
      .filter((def) => def.requiredCapabilities.every((cap) => session.capabilities.includes(cap)))

    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      },
    }
  }

  private async handleToolsCall(
    session: McpSession,
    request: McpJsonRpcRequest,
    requestId: string | number,
  ): Promise<McpJsonRpcResponse> {
    const params = request.params ?? {}
    const toolName = params.name as string | undefined
    const toolArgs = (params.arguments as Record<string, unknown>) ?? {}

    if (typeof toolName !== 'string' || toolName.length === 0) {
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32602,
          message: 'Missing or invalid tool name',
        },
      }
    }

    // 3. Validate tool exists.
    const tool = this.registry.get(toolName)
    if (tool === undefined) {
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32602,
          message: `Unknown tool: ${toolName}`,
        },
      }
    }

    // 4. Check capabilities.
    const hasCapabilities = tool.definition.requiredCapabilities.every((cap) =>
      session.capabilities.includes(cap),
    )
    if (!hasCapabilities) {
      this.observability.recordAuthDenial(toolName)
      await this.recordDeniedAudit(session, toolName)
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32002,
          message: 'Insufficient capabilities for this tool',
        },
      }
    }

    // 5. Check rate limits.
    const rateCheck = await this.rateLimiter.check(session.sessionId, toolName)
    if (!rateCheck.allowed) {
      this.observability.recordRateLimit(toolName)
      await this.recordDeniedAudit(session, toolName)
      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32029,
          message: 'Rate limit exceeded',
          data: { retryAfterMs: rateCheck.retryAfterMs },
        },
      }
    }

    // 6. Execute the tool.
    const toolCallId = uuid()
    const startTime = performance.now()

    try {
      const result = await tool.execute(session, toolArgs, toolCallId)
      const latencyMs = Math.round(performance.now() - startTime)

      // 7. Record audit event.
      await this.auditLogger.recordEvent({
        id: uuid(),
        sessionId: session.sessionId,
        principalId: session.principalId,
        organizationId: session.organizationId,
        toolName,
        requestId: toolCallId,
        outcome:
          result.status === McpToolResultStatus.SUCCESS ? ('success' as const) : ('error' as const),
        latencyMs,
        pipelineRunId: result.metadata.pipelineRunId,
        timestamp: new Date().toISOString(),
        metadata: {},
      })

      // 8. Record observability.
      this.observability.recordToolCall(
        toolName,
        result.status === McpToolResultStatus.SUCCESS,
        latencyMs,
      )

      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: result.status !== McpToolResultStatus.SUCCESS,
        },
      }
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime)
      this.observability.recordError(
        toolName,
        error instanceof Error ? error.constructor.name : 'unknown',
      )

      await this.auditLogger.recordEvent({
        id: uuid(),
        sessionId: session.sessionId,
        principalId: session.principalId,
        organizationId: session.organizationId,
        toolName,
        requestId: toolCallId,
        outcome: 'error',
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: { error: error instanceof Error ? error.message : 'unknown' },
      })

      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32603,
          message: 'Tool execution failed',
        },
      }
    }
  }
}
