/* MCP controller — HTTP transport endpoints for the MCP server.

Provides:
  POST /api/v1/mcp         — JSON-RPC style MCP request endpoint
  GET  /api/v1/mcp/tools   — List available tools
  POST /api/v1/mcp/tools/:toolName — Direct tool invocation

The controller is a thin adapter over the McpRequestHandler.
It handles HTTP-specific concerns (headers, status codes) and delegates
all logic to the request handler.

Security: The MCP endpoints use the same JWT authentication as the rest
of the API. The controller never trusts tool arguments for identity. */

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import {
  McpRequestHandler,
  type McpJsonRpcRequest,
  MCP_AUTHENTICATOR,
} from './services/mcp-request-handler'
import { IMcpAuthenticator, IMcpToolRegistry } from './domain/mcp.interfaces'

@ApiBearerAuth()
@ApiTags('MCP')
@Controller('mcp')
export class McpController {
  constructor(
    private readonly handler: McpRequestHandler,
    @Inject(MCP_AUTHENTICATOR) private readonly authenticator: IMcpAuthenticator,
    @Inject(IMcpToolRegistry) private readonly registry: IMcpToolRegistry,
  ) {}

  /**
   * Main MCP JSON-RPC endpoint. Accepts any valid MCP method:
   * - tools/list
   * - tools/call
   * - ping
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary: 'MCP JSON-RPC endpoint',
    description:
      'Handles MCP protocol requests via JSON-RPC 2.0. ' +
      'Supports methods: tools/list, tools/call, ping.',
  })
  @ApiOkResponse({ description: 'JSON-RPC response' })
  async handleMcpRequest(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: McpJsonRpcRequest,
  ) {
    return this.handler.handleRequest(body, headers)
  }

  /**
   * REST endpoint to list available MCP tools (convenience).
   * Mirrors tools/list: only tools whose capabilities the caller holds are exposed.
   */
  @Get('tools')
  @ApiOperation({
    summary: 'List MCP tools',
    description:
      'Returns registered MCP tool definitions filtered to the authenticated session capabilities.',
  })
  async listTools(@Headers() headers: Record<string, string | undefined>) {
    const session = await this.authenticator.authenticate(headers)
    if (session === null || Date.now() > Date.parse(session.expiresAt)) {
      throw new UnauthorizedException('MCP authentication required')
    }

    const tools = this.registry
      .getDefinitions()
      .filter((def) => def.requiredCapabilities.every((cap) => session.capabilities.includes(cap)))
    return { tools }
  }

  /**
   * Direct tool invocation endpoint (convenience wrapper).
   */
  @Post('tools/:toolName')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Invoke an MCP tool directly',
    description: 'Send tool arguments directly without JSON-RPC wrapping.',
  })
  async invokeTool(
    @Param('toolName') toolName: string,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: Record<string, unknown>,
  ) {
    return this.handler.handleRequest(
      {
        jsonrpc: '2.0',
        id: `direct-${Date.now()}`,
        method: 'tools/call',
        params: { name: toolName, arguments: body },
      },
      headers,
    )
  }

  /**
   * Health check for the MCP server.
   */
  @Get('health')
  @ApiOperation({ summary: 'MCP server health check' })
  health() {
    return {
      status: 'ok',
      toolCount: this.registry.getAll().length,
      timestamp: new Date().toISOString(),
    }
  }
}
